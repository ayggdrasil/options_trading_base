import { twJoin } from "tailwind-merge";
import { SupportedChains } from "@callput/shared";
import { SOCIALS } from "@/networks/configs";

interface FootBarProps {
  chain: SupportedChains;
}

const FootBar: React.FC<FootBarProps> = ({ chain }) => {
  return (
    <footer
      className={twJoin(
        "w-full px-[28px] py-[16px] flex flex-row items-center justify-center bg-black1214 overflow-hidden",
        "border-t border-t-[1px] border-t-solid border-black2023"
      )}
    >
      <div
        className={twJoin(
          "w-full max-w-[1920px] h-[40px] flex flex-row items-center justify-between"
        )}
      >
        <p className="text-gray8c8c text-[13px] font-[500] leading-[40px]">
          © 2026 CallPut.app
        </p>
        <div className="flex flex-row items-center gap-[16px]">
          {SOCIALS[chain].map((social: any) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.ariaLabel}
              className="relative w-[24px] h-[24px] group"
            >
              <img
                src={social.iconSrc}
                alt={social.name}
                className="w-[24px] h-[24px] group-hover:opacity-0 transition-opacity"
              />
              <img
                src={social.iconSrcSelected}
                alt={social.name}
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
