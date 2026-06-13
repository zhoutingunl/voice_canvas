# VoiceCanvas Android 套壳

用 WebView 加载前端，把 VoiceCanvas 打包成 Android App。几乎零业务代码——核心只是
"加载网页 + 授予麦克风权限"。

## 为什么这样做（design.md §12）

- 前端已响应式，WebView 直接加载即可，业务零改动。
- **WebView 不支持 Web Speech API**，故以 `?asr=bailian` 加载，**默认走百炼云端 ASR**（国内稳定）。
- `getUserMedia` 在 WebView 内需在 `onPermissionRequest` 显式授予麦克风（已在 `MainActivity` 处理），否则录音失败——这是套壳唯一的"非零工作量"点。

## 构建运行

> 需 Android Studio（含 Android SDK 与 JDK 17）。本工程未预编译 APK。

1. Android Studio → **Open** → 选择本 `android/` 目录，等待 Gradle Sync（首次自动下载 Gradle 8.7 与依赖）。
2. 启动后端与前端（见上级 `README.md`）。
3. 改 `app/src/main/java/com/voicecanvas/app/MainActivity.kt` 里的 `appUrl`：
   - **模拟器**：`http://10.0.2.2:5173/?asr=bailian`（`10.0.2.2` = 模拟器访问宿主机）
   - **真机**：`http://<你电脑的局域网IP>:5173/?asr=bailian`（手机与电脑同网）
   - **已部署**：换成你的 https 域名
4. ▶️ Run，在模拟器/真机运行；首次启动允许麦克风权限。

## 锁屏 / 后台处理

- **已实现（简单方案）**：`MainActivity` 加 `FLAG_KEEP_SCREEN_ON`——App 在**前台时屏幕常亮、不自动锁屏**，避免语音绘图过程中熄屏中断麦克风；退到后台即恢复系统正常锁屏。
- **进阶（按需，未实现）**：若要**锁屏/切后台仍持续录音识别**，需启动一个 `microphone` 类型的**前台服务**（`FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MICROPHONE` 权限 + 常驻通知）。这超出"前台演示"范围，作为后续增强；本 demo 采用上面的简单方案即可。

## 权限说明

`AndroidManifest.xml` 声明 `INTERNET` / `RECORD_AUDIO` / `MODIFY_AUDIO_SETTINGS`；
`usesCleartextTraffic="true"` 便于联调 http 局域网地址，**生产应改用 https 并移除**。

## 命令行构建（可选）

工程含 `gradle-wrapper.properties` 但未附带 `gradlew` 脚本/jar。如需命令行：
在本目录执行 `gradle wrapper`（需本机已装 Gradle）生成 wrapper 后，
`./gradlew assembleDebug` 产物在 `app/build/outputs/apk/debug/`。Android Studio 用户无需此步。
