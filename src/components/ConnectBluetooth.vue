<template>
  <div class="flex gap-2">
    <Button label="Bật Bluetooth" icon="pi pi-bluetooth" @click="turnOnBluetooth" />
    <Button label="In Mã QR" icon="pi pi-print" outlined size="large" />
  </div>
</template>

<script setup lang="ts">
import { Button } from 'primevue';

const turnOnBluetooth = () => {
  // Ép kiểu window thành any để qua mặt TypeScript
  const bluetoothSerial = (window as any).bluetoothSerial;

  if (bluetoothSerial) {
    // Thử gọi hàm enable() (Chỉ chạy được trên Android)
    bluetoothSerial.enable(
      function () {
        console.log("Bluetooth đã được bật thành công!");
      },
      function (err: any) {
        console.log("Không thể bật trực tiếp hoặc người dùng từ chối:", err);

        // Fallback: Mở màn hình cài đặt
        bluetoothSerial.showBluetoothSettings(
          () => console.log("Đã mở màn hình cài đặt Bluetooth"),
          (err: any) => console.error("Không thể mở màn hình cài đặt:", err)
        );
      }
    );
  } else {
    console.error("Plugin bluetoothSerial chưa được tải.");
  }
};
</script>