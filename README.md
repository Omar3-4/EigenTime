# EigenTime

EigenTime is a highly customizable, strictly offline focus and time management application built with privacy and aesthetics in mind. It helps you track your deep work sessions, measure your progress with detailed analytics, and manage your focus blocks with beautiful, dynamic user interfaces.

## Features

- **100% Offline & Private:** All data is stored locally on your machine. No cloud syncing, no accounts, no tracking.
- **Deep Focus Timer:** Fully customizable Pomodoro and stopwatch modes, complete with ambient soundscapes and dynamic color gradients.
- **Advanced Analytics:** Interactive charts to track your focus history, deep work streaks, and fatigue levels over time.
- **Gamification:** Earn XP, level up, and maintain streaks as you build your focus habits.
- **Health Tracking:** Built-in posture, hydration, and eye rest (20-20-20 rule) reminders to keep you healthy during long work sessions.
- **Cross-Platform:** Built with Tauri to provide a native, lightning-fast experience on Windows, Linux, and macOS.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating), as well as Rust for the Tauri backend.

```sh
git clone https://github.com/Omar3-4/EigenTime.git
cd EigenTime
npm install
npm run tauri dev
```

## Built with

- [Tauri](https://tauri.app)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Dexie.js (IndexedDB)](https://dexie.org/)

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See the [LICENSE](LICENSE) file for details.

## Download & Installation

Head over to the [Releases](https://github.com/Omar3-4/EigenTime/releases) page to download the latest version for Windows (\.exe\) and Linux (\.AppImage\ or \.deb\).

> [!WARNING]
> **Windows SmartScreen Protection**
> Because EigenTime is a free, open-source project developed without a paid corporate code-signing certificate, Windows SmartScreen will show a blue **'Windows protected your PC'** warning when you first open the installer.
>
> To install safely:
> 1. Click **More info** on the blue screen.
> 2. Click **Run anyway**.
