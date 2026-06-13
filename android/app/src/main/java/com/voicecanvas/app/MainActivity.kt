package com.voicecanvas.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * VoiceCanvas Android 套壳：用 WebView 加载前端，并把麦克风权限授予网页。
 *
 * 关键点（design.md §12）：
 * - WebView 不支持 Web Speech API，故以 ?asr=bailian 加载，默认走百炼云端 ASR。
 * - getUserMedia 在 WebView 内需在 onPermissionRequest 中显式 grant 麦克风，
 *   否则录音失败。
 */
class MainActivity : AppCompatActivity() {

    // 前端地址。模拟器用 10.0.2.2 指向宿主机；真机改成电脑局域网 IP（如 http://192.168.1.11:5173）
    // 或你的部署域名。?asr=bailian 让前端默认使用云端 ASR。
    private val appUrl = "http://10.0.2.2:5173/?asr=bailian"

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 1)
        }

        // 前台时保持屏幕常亮、不自动锁屏（避免语音绘图过程中熄屏中断麦克风）。
        // 仅在本界面可见时生效，退到后台即恢复系统正常锁屏行为。
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false // 允许 getUserMedia 启用麦克风
        }
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val audio = request.resources.filter {
                        it == PermissionRequest.RESOURCE_AUDIO_CAPTURE
                    }.toTypedArray()
                    if (audio.isNotEmpty()) request.grant(audio) else request.deny()
                }
            }
        }
        webView.loadUrl(appUrl)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
