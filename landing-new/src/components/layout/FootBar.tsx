import React from "react";
import { twJoin } from "tailwind-merge";
import { MEDIAS } from "../../shared/constants/media";

const FootBar: React.FC = () => {
  return (
    <footer
      className={twJoin(
        "w-full px-[28px] py-[16px] flex flex-row items-center justify-center bg-black1214 overflow-hidden",
        "border-t border-t-[1px] border-t-solid border-black2023"
      )}
    >
      <div
        className={twJoin(
          "w-full max-w-[1920px] h-[40px] flex flex-row items-center justify-between",
        )}
      >
        <p className="text-gray8c8c text-[13px] font-[500] leading-[40px]">
          © 2026 CallPut.app
        </p>
        <div className="flex flex-row items-center gap-[16px]">
          {MEDIAS.map((media) => (
            <a
              key={media.name}
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={media.ariaLabel}
              className="relative w-[24px] h-[24px] group"
            >
              <img
                src={media.imgOffSrc}
                alt={media.name}
                className="w-[24px] h-[24px] group-hover:opacity-0 transition-opacity"
              />
              <img
                src={media.imgOnSrc}
                alt={media.name}
                className="w-[24px] h-[24px] absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default FootBar;
