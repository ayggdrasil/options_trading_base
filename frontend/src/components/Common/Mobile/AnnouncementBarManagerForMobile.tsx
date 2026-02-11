import React, { useState } from "react";
import IconCloseOrange from "../../../assets/icon-close-orange.svg";
import CheckboxForMobile from "./CheckboxForMobile";
import { SupportedChains } from "@callput/shared";

export interface AnnouncementData {
  id: string;
  content: React.ReactNode;
  supports: SupportedChains[];
  isCheckable: boolean;
  expiresAt?: number;
}

interface SingleAnnouncementProps {
  announcement: AnnouncementData;
  isCheckable: boolean;
  onClose: (id: string) => void;
}

const SingleAnnouncement: React.FC<SingleAnnouncementProps> = ({
  announcement,
  isCheckable,
  onClose,
}) => {
  const [hide, setHide] = useState(false);

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHide(!hide);
    if (!hide) {
      localStorage.setItem(
        `callput:announcementBar:${announcement.id}:hideUntil`,
        (Date.now() + 24 * 60 * 60 * 1000).toString()
      );
    } else {
      localStorage.removeItem(
        `callput:announcementBar:${announcement.id}:hideUntil`
      );
    }
  };

  const handleClose = () => {
    onClose(announcement.id);
  };

  return (
    <div className="p-3 md:px-6 border-b-[1px] border-[#f7931a] bg-[#0c1410]">
      <div className="flex-grow mb-2 text-[12px] md:text-[14px] leading-[18px] text-center font-bold text-[#f7931a]">
        {announcement.content}
      </div>
      <div className="flex flex-row items-center justify-center gap-3 py-[10px]">
        {isCheckable && (
          <CheckboxForMobile
            onClick={handleHide}
            isChecked={hide}
            text="Don't show for today"
          />
        )}
        <button
          className="flex-shrink-0 cursor-pointer flex flex-row justify-center items-center w-5 h-5 rounded-full border-[1px] border-[#f7931a]"
          onClick={handleClose}
        >
          <img className="w-[14px]" src={IconCloseOrange} alt="Close" />
        </button>
      </div>
    </div>
  );
};

interface AnnouncementBarManagerForMobileProps {
  announcements: AnnouncementData[];
  handleCloseAnnouncement: (id: string) => void;
}

const AnnouncementBarManagerForMobile: React.FC<
AnnouncementBarManagerForMobileProps
> = ({ announcements, handleCloseAnnouncement }) => {
  return (
    <div className="w-full">
      {announcements.map((announcement) => (
        <SingleAnnouncement
          key={announcement.id}
          announcement={announcement}
          isCheckable={announcement.isCheckable}
          onClose={handleCloseAnnouncement}
        />
      ))}
    </div>
  );
};

export default AnnouncementBarManagerForMobile;
