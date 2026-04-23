"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="min-h-full bg-[#0a0a0a] px-5 pt-10 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-[28px] font-bold mb-1">Bildirimler</h1>
        <p className="text-[#888] text-[14px] mb-10">
          Şarkı üretim durumları ve güncellemeleri buradan takip et.
        </p>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#1f1f1f] flex items-center justify-center mb-4">
            <Bell size={26} className="text-[#555]" />
          </div>
          <p className="text-white text-[15px] font-semibold mb-1">
            Henüz bildirimin yok
          </p>
          <p className="text-[#666] text-[13px] max-w-[320px]">
            Şarkıların hazır olduğunda, beğeni ve yorumlar geldiğinde burada
            görünür.
          </p>
        </div>
      </div>
    </div>
  );
}
