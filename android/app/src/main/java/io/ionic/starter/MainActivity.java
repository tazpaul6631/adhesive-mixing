package io.ionic.starter;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

// Import plugin cân điện tử của bạn
import io.ionic.starter.SerialScalePlugin;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Đăng ký plugin trước khi gọi super.onCreate
        registerPlugin(SerialScalePlugin.class);
        super.onCreate(savedInstanceState);
    }

    // Ghi đè hàm onResume để mỗi lần bật/quay lại app đều ẩn thanh công cụ
    @Override
    public void onResume() {
        super.onResume();
        hideSystemUI();
    }

    // Hàm thực thi ẩn System UI
    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            // Ẩn thanh điều hướng ở dưới (Navigation bar)
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            // Ẩn thanh trạng thái ở trên (Status bar)
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}