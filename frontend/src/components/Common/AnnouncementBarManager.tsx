import React, { useState } from 'react';
import Checkbox from "./Checkbox";
import IconCloseOrange from "../../assets/icon-close-orange.svg";
import { SupportedChains } from '@callput/shared';

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

const SingleAnnouncement: React.FC<SingleAnnouncementProps> = ({ announcement, isCheckable, onClose }) => {
  const [hide, setHide] = useState(false);

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHide(!hide);
    if (!hide) {
      localStorage.setItem(`callput:announcementBar:${announcement.id}:hideUntil`, (Date.now() + 24 * 60 * 60 * 1000).toString());
    } else {
      localStorage.removeItem(`callput:announcementBar:${announcement.id}:hideUntil`);
    }
  };

  const handleClose = () => {
    onClose(announcement.id);
  };

  return (
    <div className="flex flex-row justify-center items-center w-full h-[46px] bg-black1a border-b-[1px] border-b-[#F7931A]">
      <div className='flex flex-row justify-between items-center w-full max-w-[1172px]'>
        <div className="flex-grow text-[13px] text-[#F7931A] font-semibold">
          {announcement.content}
        </div>
        <div className="flex flex-row items-center gap-[20px]">
          {isCheckable &&
            <Checkbox
              onClick={handleHide}
              isChecked={hide}
              text="Don't show for today"
            />
          }
          <button
            className="cursor-pointer flex flex-row justify-center items-center w-[24px] h-[24px] rounded-full border-[1px] border-[#F7931A]"
            onClick={handleClose}
          >
            <img className="w-[18px]" src={IconCloseOrange} alt="Close" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface AnnouncementBarManagerProps {
  announcements: AnnouncementData[];
  handleCloseAnnouncement: (id: string) => void;
}

const AnnouncementBarManager: React.FC<AnnouncementBarManagerProps> = ({ announcements, handleCloseAnnouncement }) => {
  return (
    <div className='z-30 fixed top-[72px] w-full'>
      {announcements.map(announcement => (
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

export default AnnouncementBarManager;