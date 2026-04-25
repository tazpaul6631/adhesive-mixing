package io.ionic.starter;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.util.SerialInputOutputManager;
import java.io.IOException;
import java.util.List;

@CapacitorPlugin(name = "SerialScale")
public class SerialScalePlugin extends Plugin implements SerialInputOutputManager.Listener {
    private UsbSerialPort usbPort;
    private SerialInputOutputManager ioManager;

    @PluginMethod
    public void connect(PluginCall call) {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        List<UsbSerialDriver> availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

        if (availableDrivers.isEmpty()) {
            call.reject("Không tìm thấy thiết bị USB nào!");
            return;
        }

        UsbSerialDriver driver = availableDrivers.get(0);
        UsbDevice device = driver.getDevice();

        if (!manager.hasPermission(device)) {
            // Xin quyền nếu chưa có
            int flags = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
            PendingIntent usbPermissionIntent = PendingIntent.getBroadcast(getContext(), 0, new Intent("com.android.example.USB_PERMISSION"), flags);
            manager.requestPermission(device, usbPermissionIntent);
            call.reject("Đang xin quyền, hãy bấm OK trên màn hình rồi thử lại");
            return;
        }

        try {
            UsbDeviceConnection connection = manager.openDevice(device);
            usbPort = driver.getPorts().get(0);
            usbPort.open(connection);
            // Cài đặt thông số giống App Terminal
            usbPort.setParameters(9600, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            usbPort.setDTR(true);
            usbPort.setRTS(true);

            ioManager = new SerialInputOutputManager(usbPort, this);
            ioManager.start();

            call.resolve();
        } catch (IOException e) {
            call.reject("Lỗi kết nối: " + e.getMessage());
        }
    }

    @Override
    public void onNewData(byte[] data) {
        // Dữ liệu thô từ cân trả về đây
        String message = new String(data);
        JSObject ret = new JSObject();
        ret.put("data", message);
        notifyListeners("onScaleData", ret); // Gửi về Vue
    }

    @Override
    public void onRunError(Exception e) {
        JSObject ret = new JSObject();
        ret.put("error", e.getMessage());
        notifyListeners("onScaleError", ret);
    }
}