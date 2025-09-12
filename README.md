# 🚀 RocketBooker Browser Extension

Browser extension version of RocketBooker for PopMart Thailand auto-booking.

## ✨ Features

- **Auto Booking**: Automated booking flow for PopMart Thailand
- **Smart Selectors**: Dynamic selectors from cloud configuration
- **Minigame Solver**: Automatic minigame solving
- **Profile Management**: Auto-fill personal information
- **Multi-Browser Support**: Chrome, Safari, Orion compatible
- **Real-time Status**: Live booking status updates

## 🔧 Installation

### Chrome/Chromium Browsers
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `rocketbooker-extension` folder
5. Extension will appear in toolbar

### Safari (macOS)
1. Open Safari → Preferences → Advanced
2. Check "Show Develop menu"
3. Develop → Allow Unsigned Extensions
4. Load extension folder

### Orion Browser
1. Open Orion → Preferences → Extensions
2. Enable "Developer Extensions"
3. Load unpacked extension

## 🎯 Usage

1. **Navigate** to https://popmartth.rocket-booking.app/booking
2. **Click** the RocketBooker extension icon
3. **Configure** your booking preferences:
   - Select branch
   - Choose day (1-5)
   - Choose round (1-5)
   - Optional: Enable profile auto-fill
4. **Click** "เริ่มจอง" to start
5. **Monitor** progress in real-time

## ⚙️ Configuration

### Basic Settings
- **Branch**: Target branch for booking
- **Day**: Day preference (1 = first available)
- **Round**: Time slot preference (1 = first available)

### Profile Auto-fill
Enable to automatically fill personal information:
- First Name (ชื่อ)
- Last Name (นามสกุล)  
- Phone Number (เบอร์โทร)
- ID Card Number (เลขบัตรประชาชน)

## 🔄 How It Works

1. **Selector Loading**: Fetches dynamic selectors from cloud
2. **Register Click**: Waits for and clicks register button
3. **Branch Selection**: Selects specified or first available branch
4. **Date/Time**: Chooses date and time based on preferences
5. **Minigame Handling**: Auto-solves any minigames encountered
6. **Profile Fill**: Auto-fills profile if enabled
7. **Final Confirmation**: Completes booking process

## 🛡️ Security & Privacy

- **No Data Collection**: All data stays local
- **Secure Communication**: HTTPS only
- **Minimal Permissions**: Only required permissions
- **Open Source**: Full code transparency

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Modern extension standard
- **Content Script**: Handles page interaction
- **Background Service**: Manages extension lifecycle
- **Popup Interface**: User configuration

### Browser Compatibility
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Safari 14+
- ✅ Orion 0.99+
- ✅ Firefox (with minor modifications)

## 🚨 Disclaimer

This extension is for educational and personal use only. Users are responsible for:
- Complying with website terms of service
- Using the extension ethically and responsibly
- Understanding booking policies and procedures

## 📝 Version History

### v1.0.0
- Initial release
- Core booking functionality
- Multi-browser support
- Profile auto-fill
- Minigame auto-solver

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test across browsers
5. Submit pull request

## 📞 Support

For issues or questions:
- Check browser console for error messages
- Verify website compatibility
- Ensure extension permissions are granted

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.