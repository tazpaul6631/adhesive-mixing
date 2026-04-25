package io.ionic.starter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// Thêm dòng này nếu IDE vẫn báo đỏ
import io.ionic.starter.SerialScalePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SerialScalePlugin.class);
        super.onCreate(savedInstanceState);
    }
}