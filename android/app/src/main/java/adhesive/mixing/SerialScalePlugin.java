package adhesive.mixing;

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
    private UsbDeviceConnection usbConnection;

    private void internalDisconnect() {
        if (ioManager != null) {
            ioManager.stop();
            ioManager = null;
        }

        if (usbPort != null) {
            try {
                usbPort.close();
            } catch (IOException ignored) {
            }
            usbPort = null;
        }

        if (usbConnection != null) {
            usbConnection.close();
            usbConnection = null;
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        internalDisconnect();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        internalDisconnect();

        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        List<UsbSerialDriver> availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

        if (availableDrivers.isEmpty()) {
            call.reject("Không tìm thấy thiết bị USB nào!");
            return;
        }

        UsbSerialDriver driver = availableDrivers.get(0);
        UsbDevice device = driver.getDevice();

        if (!manager.hasPermission(device)) {
            int flags = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S
                ? PendingIntent.FLAG_MUTABLE
                : 0;
            PendingIntent usbPermissionIntent = PendingIntent.getBroadcast(
                getContext(),
                0,
                new Intent("com.android.example.USB_PERMISSION"),
                flags
            );
            manager.requestPermission(device, usbPermissionIntent);
            call.reject("Đang xin quyền, hãy bấm OK trên màn hình rồi thử lại");
            return;
        }

        try {
            usbConnection = manager.openDevice(device);
            usbPort = driver.getPorts().get(0);
            usbPort.open(usbConnection);
            usbPort.setParameters(9600, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            usbPort.setDTR(true);
            usbPort.setRTS(true);

            ioManager = new SerialInputOutputManager(usbPort, this);
            ioManager.start();

            call.resolve();
        } catch (IOException e) {
            internalDisconnect();
            call.reject("Lỗi kết nối: " + e.getMessage());
        }
    }

    @Override
    public void onNewData(byte[] data) {
        String message = new String(data);
        JSObject ret = new JSObject();
        ret.put("data", message);
        notifyListeners("onScaleData", ret);
    }

    @Override
    public void onRunError(Exception e) {
        internalDisconnect();
        JSObject ret = new JSObject();
        ret.put("error", e.getMessage());
        notifyListeners("onScaleError", ret);
    }
}
