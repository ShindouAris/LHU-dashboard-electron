interface User {
  UserID: string;
  UserName: string;
  LastName: string;
  FirstName: string;
  DepartmentID: string;
  Email: string;
  EmailReceived: boolean;
  MessagePermission: number;
  FriendPermission: number;
  GroupID: number;
  Avatar: string;
  isAuth: boolean;
  FullName: string;
  GroupName: string;
  Class: string;
  DepartmentName: string;
}

interface ScheduleItem {
  ID: number;
  NhomID: number;
  ThoiGianBD: string;
  ThoiGianKT: string;
  TenPhong: string;
  TenNhom: string;
  TenMonHoc: string;
  GiaoVien: string;
  Buoi: number;
  Thu: number;
  TinhTrang: number;
  Type: number;
  TenCoSo: string;
  GoogleMap: string;
  OnlineLink: string;
  CalenType: number;
  SoTietBuoi: number;
}