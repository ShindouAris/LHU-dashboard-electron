<div align="center">

<img src="assets/build/icon.png" alt="LHU Dashboard" width="104" />

# LHU Dashboard

### Lịch học rõ ràng. Ngày học chủ động hơn.

Không gian học tập dành cho sinh viên Đại học Lạc Hồng — truy cập Dashboard ngay trên desktop, nhận nhắc lịch học và giữ những công cụ thường dùng trong tầm tay.

[**Trải nghiệm trên web**](https://lhu-dashboard.vercel.app) · [**Tải ứng dụng desktop**](https://github.com/ShindouAris/LHU-dashboard-electron/releases/latest) · [Báo lỗi & góp ý](https://github.com/ShindouAris/LHU-dashboard-electron/issues)

![Version](https://img.shields.io/github/package-json/v/ShindouAris/LHU-dashboard-electron?label=desktop&color=2563eb)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-334155)

</div>

---

## Bớt tìm kiếm. Tập trung vào việc học.

Một ngày học có nhiều thứ cần nhớ: môn tiếp theo, giờ vào lớp, phòng học và những công cụ cần mở. LHU Dashboard đưa trải nghiệm web vào một ứng dụng desktop riêng, bổ sung thông báo hệ thống và khả năng chạy nền để bạn không phải giữ Dashboard giữa hàng loạt tab trình duyệt.

## Những tiện ích đồng hành mỗi ngày

| Tiện ích | Giá trị sử dụng |
| --- | --- |
| **Dashboard trong cửa sổ riêng** | Mở không gian học tập trực tiếp từ desktop, không lẫn với các tab trình duyệt. |
| **Nhắc buổi học sắp tới** | Nhận thông báo trong 30 phút trước giờ học, kèm môn học, phòng và cơ sở khi dữ liệu lịch có sẵn. |
| **Chạy nền ở khay hệ thống** | Ẩn cửa sổ khi đóng và mở lại từ tray; có thể thay đổi hành vi trong cài đặt. |
| **Khởi động cùng máy** | Tùy chọn mở ứng dụng khi đăng nhập hệ điều hành. |
| **Discord Rich Presence** | Hiển thị khu vực Dashboard đang sử dụng trên Discord; có thể bật hoặc tắt. |
| **Kiểm tra bản cập nhật** | Tích hợp cơ chế kiểm tra và thông báo cập nhật từ GitHub Releases. |

> Nhắc lịch cần đăng nhập, kết nối Internet, quyền thông báo của hệ điều hành và ứng dụng còn chạy. Khả năng tự cập nhật phụ thuộc nền tảng và loại gói cài đặt.

## Bắt đầu trong vài bước

1. **Chọn cách truy cập.** [Mở bản web](https://lhu-dashboard.vercel.app) hoặc tải gói phù hợp trong [Releases](https://github.com/ShindouAris/LHU-dashboard-electron/releases/latest).
2. **Đăng nhập trên Dashboard.** Nội dung giao diện được cung cấp bởi dịch vụ web.
3. **Thiết lập theo thói quen.** Bật nhắc lịch, khởi động cùng máy hoặc Discord RPC trong phần cài đặt khi dùng bản desktop.

### Chọn nền tảng của bạn

| Nền tảng | Định dạng đóng gói được cấu hình |
| --- | --- |
| Windows | Bộ cài NSIS `.exe`, `.msi` |
| macOS | `.dmg`, `.zip` |
| Linux | `.AppImage`, `.tar.gz` |

Các tệp có sẵn thực tế nằm trong từng bản phát hành. Trên Windows, nên cài bằng installer để hệ thống đăng ký đúng tên và icon của ứng dụng trong thông báo.

## Web linh hoạt. Desktop thuận tiện.

Bản web phù hợp khi bạn cần truy cập nhanh. Bản desktop bổ sung những tích hợp gắn với máy tính: tray, thông báo hệ thống, khởi động cùng máy và Discord RPC.

Repository này chứa **ứng dụng Electron**, không chứa mã nguồn giao diện web hoặc backend. Ứng dụng tải Dashboard trực tuyến; đây không phải bản sao hoạt động hoàn toàn ngoại tuyến.

## Câu hỏi thường gặp

### Có cần cài ứng dụng để dùng Dashboard không?

Không. Bạn có thể [dùng bản web](https://lhu-dashboard.vercel.app). Cài desktop khi cần các tích hợp với hệ điều hành.

### Đóng cửa sổ có dừng nhắc lịch không?

Nếu bật chế độ ẩn khi đóng, ứng dụng tiếp tục chạy nền. Chọn **Thoát Ứng dụng** trong menu tray để thoát hẳn; khi đó ứng dụng không còn gửi nhắc lịch.

### Vì sao chưa nhận được thông báo lịch học?

Kiểm tra trạng thái đăng nhập, kết nối mạng, tùy chọn nhắc lịch và quyền thông báo của hệ điều hành. Thông báo chỉ được tạo khi API trả về buổi học tiếp theo trong khoảng thời gian nhắc.

### Có widget lịch học trên desktop chưa?

Chưa. Widget lịch học tiếp theo chưa được triển khai trong phiên bản mã nguồn hiện tại.

## Dành cho người phát triển

### Chạy tại máy

Dùng Node.js 24 trở lên để chạy bộ kiểm tra hiện tại.

```bash
npm ci
npm start
```

Ở chế độ development, Electron tải `http://localhost:5173`. Bạn cần khởi chạy frontend riêng tại địa chỉ đó; repository này không cung cấp frontend dev server.

### Kiểm tra và đóng gói

```bash
npm test
npm run build
```

Build tạo đầu ra dưới `dist/`. Windows có dependency native có thể cần bộ công cụ C++ tương thích với `node-gyp` và Electron.

### Các điểm vào chính

| File | Chức năng |
| --- | --- |
| `main.ts` | Vòng đời ứng dụng, cửa sổ, tray, nhắc lịch, cấu hình, Discord RPC và updater |
| `preload.js` | Bridge giữa giao diện web và các chức năng desktop |
| `settings.ts` | Kiểu dữ liệu cấu hình |
| `lhu.ts` | Kiểu dữ liệu người dùng và lịch học |
| `test.mjs` | Regression checks |
| `.github/workflows/main.yml` | Pipeline build và phát hành khi push tag `v*.*.*` |

## Góp phần làm Dashboard tốt hơn

Gặp lỗi hoặc có ý tưởng? [Mở issue](https://github.com/ShindouAris/LHU-dashboard-electron/issues) và mô tả nền tảng, phiên bản, các bước tái hiện cùng kết quả mong muốn. Không đính kèm mật khẩu, token hoặc thông tin sinh viên nhạy cảm.

---

<div align="center">

**Sẵn sàng cho buổi học tiếp theo?**

[Truy cập Dashboard](https://lhu-dashboard.vercel.app) · [Tải bản desktop](https://github.com/ShindouAris/LHU-dashboard-electron/releases/latest)

Phát triển bởi **Chisadin chan**.

</div>
