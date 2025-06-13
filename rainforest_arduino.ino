#include <WiFi.h>
#include "driver/i2s.h"
#include <DHT.h>
#include <ArduinoWebsockets.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

#define I2S_WS_RX  27
#define I2S_SCK_RX 14
#define I2S_SD_RX  12
#define I2S_PORT I2S_NUM_1
#define I2S_SAMPLE_RATE   (16000)
#define I2S_SAMPLE_BITS   (32)
#define I2S_READ_LEN      (1024)
#define RELAY_PIN 23
#define DHT22_PIN 21

DHT dht22(DHT22_PIN, DHT22);
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);


bool isButton = false;

float thresholdHumi = 35.0;
float thresholdTemp = 40.0;

uint64_t chipid = ESP.getEfuseMac(); 
String mac = String((uint16_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);

const char* ssid = "aaasss";
const char* password = "asdasd123";

const char* server_host = "192.168.141.28";
const uint16_t server_port = 8000;

unsigned long lastTimeGPS = 0;
const unsigned long debounceDelayGPS = 30000;
unsigned long lastTimeHumiAndTemp = 0;
const unsigned long debounceDelayHumiAndTemp = 2000;

TaskHandle_t i2sADCHandler = NULL;

using namespace websockets;
WebsocketsClient clientSound;
WebsocketsClient clientHumiAndTemp;
HTTPClient clientGPS;

const i2s_config_t i2s_config_rx = {
  .mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX),
  .sample_rate = I2S_SAMPLE_RATE,
  .bits_per_sample = i2s_bits_per_sample_t(I2S_SAMPLE_BITS),
  .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
  .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_I2S | I2S_COMM_FORMAT_I2S_MSB),
  .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1, // default interrupt priority
  .dma_buf_count = 32,
  .dma_buf_len = 64
};

const i2s_pin_config_t pin_config_rx = {
  .bck_io_num = I2S_SCK_RX,
  .ws_io_num = I2S_WS_RX,
  .data_out_num = I2S_PIN_NO_CHANGE,
  .data_in_num = I2S_SD_RX
};

void setup() {
  Serial.begin(115200);
  dht22.begin();
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); 

  start_to_connect();
}

void start_to_connect(){
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("Socket Connecting");
  
  clientSound.onEvent(onEventsCallback);

  while(!clientHumiAndTemp.connect(server_host, server_port, "/ws/sensor/?deviceId=" + mac)
  || !clientSound.connect(server_host, server_port, "/ws/sounds/?deviceId=" + mac)){
    delay(500);
    Serial.print(".");
  }
  clientHumiAndTemp.onMessage(getDataOnWebSocket);
  Serial.println("Socket Connected!"); 

}

void i2s_adc_data_scale(uint8_t * d_buff, uint8_t* s_buff, uint32_t len)
{
    uint32_t j = 0;
    uint32_t dac_value = 0;
    for (int i = 0; i < len; i += 2) {
        dac_value = ((((uint16_t) (s_buff[i + 1] & 0xf) << 8) | ((s_buff[i + 0]))));
        d_buff[j++] = 0;
        d_buff[j++] = dac_value * 256 / 2048 ;
    }
}

static void i2s_adc_task(void *arg)
{
    i2s_driver_install(I2S_NUM_1, &i2s_config_rx, 0, NULL);
    i2s_set_pin(I2S_NUM_1, &pin_config_rx);

    int i2s_read_len = I2S_READ_LEN;
    size_t bytes_read;

    char* i2s_read_buff = (char*) calloc(i2s_read_len, sizeof(char));
    uint8_t* flash_write_buff = (uint8_t*) calloc(i2s_read_len, sizeof(char));

    while (1) {
        i2s_read(I2S_PORT, (void*) i2s_read_buff, i2s_read_len, &bytes_read, portMAX_DELAY);
        i2s_adc_data_scale(flash_write_buff, (uint8_t*)i2s_read_buff, i2s_read_len);
        clientSound.sendBinary((const char*)flash_write_buff, i2s_read_len);
        // ets_printf("Never Used Stack Size: %u\n", uxTaskGetStackHighWaterMark(NULL));
    }
    
    free(i2s_read_buff);
    i2s_read_buff = NULL;
    free(flash_write_buff);
    flash_write_buff = NULL;
}

void processHumidityAndTemperature() {
  unsigned long currentTime = millis();
  if (currentTime - lastTimeHumiAndTemp > debounceDelayHumiAndTemp) {

    clientHumiAndTemp.poll();
    // Đọc cảm biến và gửi dữ liệu
    float humi  = dht22.readHumidity();
    float tempC = dht22.readTemperature();

    if (!isnan(humi) && !isnan(tempC)) {
      String json = "{\"device_id\": \"" + mac +
                    "\", \"temperature\": " + String(tempC, 2) +
                    ", \"humidity\": " + String(humi, 2) + "}";

      if (humi < thresholdHumi && tempC > thresholdTemp) {
        Serial.println("Báo cháy, bật phun nước");
        digitalWrite(RELAY_PIN, HIGH);
      } else {
        if (!isButton) {
          digitalWrite(RELAY_PIN, LOW);
        }
      }

      if (clientHumiAndTemp.available()) {
          Serial.print("Gửi: ");
          Serial.println(json);
          clientHumiAndTemp.send(json);
          Serial.println("Gửi cảm biến độ ẩm, nhiệt độ thành công!");
      } else {
          Serial.println("WebSocket không kết nối, không gửi được!");
      }
    } else {
      Serial.println("Không đọc được cảm biến!");
    }
    lastTimeHumiAndTemp = currentTime;
  }
}

void getDataOnWebSocket(WebsocketsMessage message) {
    Serial.print("Server response: ");
    Serial.println(message.data());
    
    if (message.data().length() == 0) {
        Serial.println("Empty message.");
        return;
    }
    String responseData = message.data();
    Serial.println("Nhận phản hồi: " + responseData);
    if (responseData == "open") {
      Serial.println("Open");
      isButton = true;
      digitalWrite(RELAY_PIN, HIGH);
    } else if (responseData == "close") {
      Serial.println("Close");
      isButton = false;
      digitalWrite(RELAY_PIN, LOW);
    }
    
}

void processGPS() {
 
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  unsigned long currentTime = millis();
  if (currentTime - lastTimeGPS > debounceDelayGPS) {
    if (gps.location.isValid()) {
      float latitude = gps.location.lat();
      float longitude = gps.location.lng();

      // float latitude = 1.8;
      // float longitude = 1.8;
      String jsonPayload = "{\"device_id\": \"" + mac + 
                                "\",  \"latitude\": " + String(latitude,7) +
                                ", \"longitude\": " + String(longitude,7) + "}";
      Serial.println(jsonPayload);
      WiFiClient httpClient;
      clientGPS.begin(httpClient, server_host, server_port, "/gps/update-location/");
      clientGPS.addHeader("Content-Type", "application/json");
      int httpResponseCode = clientGPS.PUT(jsonPayload);
      if (httpResponseCode > 0) {
        Serial.println("GPS Data sent successfully");
      } else {
        Serial.printf("Failed to send GPS. HTTP error: %d\n", httpResponseCode);
      }
      clientGPS.end();
      
    } else {
      Serial.println("GPS location is not valid.");
    }
    lastTimeGPS = currentTime;
  }  
}
void loop() {
  processGPS();
  processHumidityAndTemperature();
}

void onEventsCallback(WebsocketsEvent event, String data) {
    if(event == WebsocketsEvent::ConnectionOpened) {
        Serial.println("Connnection Opened");
        xTaskCreate(i2s_adc_task, "i2s_adc_task", 4096, NULL, 1, &i2sADCHandler);
    } else if(event == WebsocketsEvent::ConnectionClosed) {
        Serial.println("Connnection Closed");
        ESP.restart();
    }
}
