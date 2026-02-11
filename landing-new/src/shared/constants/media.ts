import { CALLPUT_URLS, SOCIAL_URLS } from "./urls";

import IconDocsOn from "../../assets/media/docs-on.png";
import IconDocsOff from "../../assets/media/docs-off.png";
import IconDocsBlack from "../../assets/media/docs-black.png";
import IconXOn from "../../assets/media/x-on.png";
import IconXOff from "../../assets/media/x-off.png";
import IconXBlack from "../../assets/media/x-black.png";
import IconTelegramOn from "../../assets/media/telegram-on.png";
import IconTelegramOff from "../../assets/media/telegram-off.png";
import IconTelegramBlack from "../../assets/media/telegram-black.png";
import IconDiscordOn from "../../assets/media/discord-on.png";
import IconDiscordOff from "../../assets/media/discord-off.png";
import IconDiscordBlack from "../../assets/media/discord-black.png";


export interface Media {
  name: string;
  imgOnSrc: string;
  imgOffSrc: string;
  imgBlackSrc: string;
  url: string;
  ariaLabel?: string;
}

export const MEDIAS: Media[] = [
  {
    name: "Docs",
    imgOnSrc: IconDocsOn,
    imgOffSrc: IconDocsOff,
    imgBlackSrc: IconDocsBlack,
    url: CALLPUT_URLS.DOCS,
    ariaLabel: "Read our docs",
  },
  {
    name: "X",
    imgOnSrc: IconXOn,
    imgOffSrc: IconXOff,
    imgBlackSrc: IconXBlack,
    url: SOCIAL_URLS.X,
    ariaLabel: "Follow us on X",
  },
  {
    name: "Telegram",
    imgOnSrc: IconTelegramOn,
    imgOffSrc: IconTelegramOff,
    imgBlackSrc: IconTelegramBlack,
    url: SOCIAL_URLS.TELEGRAM,
    ariaLabel: "Join our Telegram group",
  },
  {
    name: "Discord",
    imgOnSrc: IconDiscordOn,
    imgOffSrc: IconDiscordOff,
    imgBlackSrc: IconDiscordBlack,
    url: SOCIAL_URLS.DISCORD,
    ariaLabel: "Join our Discord server",
  },
];
