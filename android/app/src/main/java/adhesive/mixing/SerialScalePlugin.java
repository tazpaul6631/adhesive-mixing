package adhesive.mixing;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import com.getcapacitor.JSArray;
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

    private List<UsbSerialDriver> findAllDrivers() {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        return UsbSerialProber.getDefaultProber().findAllDrivers(manager);
    }

    private UsbSerialDriver findDriverById(String deviceId) {
        if (deviceId == null || deviceId.isEmpty()) {
            return null;
        }

        for (UsbSerialDriver driver : findAllDrivers()) {
            if (deviceId.equals(driver.getDevice().getDeviceName())) {
                return driver;
            }
        }

        return null;
    }

    private boolean ensureUsbPermission(UsbManager manager, UsbDevice device) {
        if (manager.hasPermission(device)) {
            return true;
        }

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
        return false;
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        List<UsbSerialDriver> availableDrivers = findAllDrivers();
        JSArray devices = new JSArray();

        for (int index = 0; index < availableDrivers.size(); index++) {
            UsbSerialDriver driver = availableDrivers.get(index);
            UsbDevice device = driver.getDevice();

            JSObject item = new JSObject();
            item.put("id", device.getDeviceName());
            String scaleName;
            if (index == 0) {
                scaleName = "Cân Nhỏ";
            } else if (index == 1) {
                scaleName = "Cân Lớn";
            } else {
                scaleName = String.format(
                    "Cân %d",
                    index + 1,
                    device.getVendorId(),
                    device.getProductId()
                );
            }
            item.put("label", scaleName);
            item.put("vendorId", device.getVendorId());
            item.put("productId", device.getProductId());
            item.put("hasPermission", manager.hasPermission(device));
            devices.put(item);
        }

        JSObject ret = new JSObject();
        ret.put("devices", devices);
        call.resolve(ret);
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
        List<UsbSerialDriver> availableDrivers = findAllDrivers();

        if (availableDrivers.isEmpty()) {
            call.reject("Không tìm thấy thiết bị USB nào!");
            return;
        }

        String deviceId = call.getString("deviceId");
        UsbSerialDriver driver = findDriverById(deviceId);
        if (driver == null) {
            driver = availableDrivers.get(0);
        }

        UsbDevice device = driver.getDevice();

        if (!ensureUsbPermission(manager, device)) {
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

            JSObject ret = new JSObject();
            ret.put("deviceId", device.getDeviceName());
            call.resolve(ret);
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
