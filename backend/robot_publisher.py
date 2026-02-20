import paho.mqtt.client as mqtt
import random
import time
import json

client = mqtt.Client()
client.connect("localhost", 1883, 60)  # Adjust host/port if needed

while True:
    speed = round(random.uniform(0, 1), 2)
    battery = random.randint(20, 100)
    sensors = {
        'Lidar': random.randint(0, 100),
        'Camera': random.randint(0, 100),
        'Ultrasonic': random.randint(0, 100)
    }
    temperature = round(random.uniform(25, 30), 2)

    client.publish("robot/speed", str(speed))
    client.publish("robot/battery", str(battery))
    client.publish("robot/sensors", json.dumps(sensors))
    client.publish("robot/temperature", str(temperature))

    # Print all values, including temperature
    print(f"Published - Speed: {speed}, Battery: {battery}, Sensors: {sensors}, Temperature: {temperature}")

    time.sleep(2)