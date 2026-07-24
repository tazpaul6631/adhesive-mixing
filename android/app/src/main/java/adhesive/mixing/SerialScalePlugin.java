package adhesive.mixing;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Log;
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
    private static final String TAG = "SerialScale";
    /** Cho IO thread thoát trước khi close port — tránh treo chip USB-RS232 khi switch cân. */
    private static final int IO_STOP_SETTLE_MS = 350;

    private UsbSerialPort usbPort;
    private SerialInputOutputManager ioManager;
    private UsbDeviceConnection usbConnection;
    private String connectedDeviceId = null;
    private volatile boolean disconnecting = false;

    private void internalDisconnect() {
        disconnecting = true;

        SerialInputOutputManager manager = ioManager;
        ioManager = null;
        if (manager != null) {
            try {
                manager.stop();
            } catch (Exception ignored) {
            }
            // stop() chỉ đánh dấu STOPPING; chờ thread đọc thoát trước khi đóng port.
            try {
                Thread.sleep(IO_STOP_SETTLE_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        UsbSerialPort port = usbPort;
        usbPort = null;
        if (port != null) {
            try {
                port.setDTR(false);
                port.setRTS(false);
            } catch (Exception ignored) {
            }
            try {
                port.close();
            } catch (IOException ignored) {
            }
        }

        UsbDeviceConnection connection = usbConnection;
        usbConnection = null;
        if (connection != null) {
            try {
                connection.close();
            } catch (Exception ignored) {
            }
        }

        connectedDeviceId = null;
        disconnecting = false;
    }

    private List<UsbSerialDriver> findAllDrivers() {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        return UsbSerialProber.getDefaultProber().findAllDrivers(manager);
    }

    private String readDeviceSerial(UsbDevice device) {
        try {
            String serial = device.getSerialNumber();
            if (serial != null && !serial.isEmpty()) {
                return serial;
            }
        } catch (SecurityException ignored) {
        }
        return "";
    }

    /** ID ổn định theo serial USB; fallback deviceName khi chưa có quyền đọc serial. */
    private String getDeviceStableId(UsbDevice device) {
        String serial = readDeviceSerial(device);
        if (!serial.isEmpty()) {
            return serial;
        }
        return device.getDeviceName();
    }

    private UsbSerialDriver findDriverById(String deviceId) {
        if (deviceId == null || deviceId.isEmpty()) {
            return null;
        }

        for (UsbSerialDriver driver : findAllDrivers()) {
            UsbDevice device = driver.getDevice();
            if (deviceId.equals(getDeviceStableId(device))
                || deviceId.equals(device.getDeviceName())) {
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

        for (UsbSerialDriver driver : availableDrivers) {
            UsbDevice device = driver.getDevice();
            String stableId = getDeviceStableId(device);
            String serial = readDeviceSerial(device);

            JSObject item = new JSObject();
            item.put("id", stableId);
            item.put("label", stableId);
            item.put("serial", serial);
            item.put("deviceName", device.getDeviceName());
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
    public void requestPermissions(PluginCall call) {
        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        List<UsbSerialDriver> availableDrivers = findAllDrivers();
        int requested = 0;
        int granted = 0;

        for (UsbSerialDriver driver : availableDrivers) {
            UsbDevice device = driver.getDevice();
            if (manager.hasPermission(device)) {
                granted++;
                continue;
            }
            ensureUsbPermission(manager, device);
            requested++;
        }

        JSObject ret = new JSObject();
        ret.put("requested", requested);
        ret.put("granted", granted);
        ret.put("total", availableDrivers.size());
        call.resolve(ret);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        internalDisconnect();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceId = call.getString("deviceId");

        if (deviceId != null
            && !deviceId.isEmpty()
            && deviceId.equals(connectedDeviceId)
            && usbPort != null
            && ioManager != null) {
            JSObject ret = new JSObject();
            ret.put("deviceId", connectedDeviceId);
            call.resolve(ret);
            return;
        }

        internalDisconnect();

        UsbManager manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        List<UsbSerialDriver> availableDrivers = findAllDrivers();

        if (availableDrivers.isEmpty()) {
            call.reject("Không tìm thấy thiết bị USB nào!");
            return;
        }

        UsbSerialDriver driver = findDriverById(deviceId);
        if (driver == null) {
            call.reject("Không tìm thấy cân đã chọn. Hãy bấm refresh để quét lại USB.");
            return;
        }

        UsbDevice device = driver.getDevice();

        if (!ensureUsbPermission(manager, device)) {
            call.reject("Đang xin quyền, hãy bấm OK trên màn hình rồi thử lại");
            return;
        }

        try {
            usbConnection = manager.openDevice(device);
            if (usbConnection == null) {
                call.reject("Không mở được thiết bị USB. Hãy rút cắm lại cân rồi thử refresh.");
                return;
            }

            usbPort = driver.getPorts().get(0);
            usbPort.open(usbConnection);
            usbPort.setParameters(9600, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            usbPort.setDTR(true);
            usbPort.setRTS(true);

            // Cho chip USB-RS232 settle sau khi mở port trước khi start IO.
            try {
                Thread.sleep(150);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            ioManager = new SerialInputOutputManager(usbPort, this);
            ioManager.start();

            connectedDeviceId = getDeviceStableId(device);

            JSObject ret = new JSObject();
            ret.put("deviceId", connectedDeviceId);
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Connect failed", e);
            internalDisconnect();
            call.reject("Lỗi kết nối: " + e.getMessage());
        }
    }

    @Override
    public void onNewData(byte[] data) {
        if (disconnecting || ioManager == null) {
            return;
        }
        String message = new String(data);
        JSObject ret = new JSObject();
        ret.put("data", message);
        notifyListeners("onScaleData", ret);
    }

    @Override
    public void onRunError(Exception e) {
        // Bỏ qua lỗi phát sinh khi đang chủ động disconnect (tránh race khi switch cân).
        if (disconnecting) {
            return;
        }
        Log.w(TAG, "Serial IO error", e);
        internalDisconnect();
        JSObject ret = new JSObject();
        ret.put("error", e != null ? e.getMessage() : "serial error");
        notifyListeners("onScaleError", ret);
    }
}
