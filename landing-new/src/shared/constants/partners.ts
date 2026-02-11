import LogoPtrGmx from "../../assets/images/partners/logo-ptr-gmx.png";
import LogoPtrBlockscholes from "../../assets/images/partners/logo-ptr-blocksholes.png"
import LogoPtrGsr from "../../assets/images/partners/logo-ptr-gsr.png"
import LogoPtrStradle from "../../assets/images/partners/logo-ptr-stradle.png"
import LogoPtrPumpbtc from "../../assets/images/partners/logo-ptr-pumpbtc.png";
import LogoPtrInfrared from "../../assets/images/partners/logo-ptr-infrared.png";
import LogoPtrD2 from "../../assets/images/partners/logo-ptr-d2.png";
import LogoPtrBgtmarket from "../../assets/images/partners/logo-ptr-bgtmarket.png";
import LogoPtrDirac from "../../assets/images/partners/logo-ptr-dirac.png";
import LogoPtrKodiak from "../../assets/images/partners/logo-ptr-kodiak.png";
import LogoPtrWebera from "../../assets/images/partners/logo-ptr-webera.png";
import LogoPtrGrix from "../../assets/images/partners/logo-ptr-grix.png";
import LogoPtrKnightsafe from "../../assets/images/partners/logo-ptr-knightsafe.png";
import LogoPtrAlfadao from "../../assets/images/partners/logo-ptr-alfadao.png";
import LogoPtrUdao from "../../assets/images/partners/logo-ptr-udao.png";

import LogoAudHacken from "../../assets/images/partners/logo-aud-hacken.png";
import LogoAudOmniscia from "../../assets/images/partners/logo-aud-omniscia.png";
import LogoAudPessimistic from "../../assets/images/partners/logo-aud-pessimistic.png";
import LogoAudPeckShield from "../../assets/images/partners/logo-aud-peckshield.png";

export interface Partner {
  name: string;
  imgSrc: string;
  website?: string;
}

export const PARTNERS: Partner[] = [
  {
    name: "GMX",
    imgSrc: LogoPtrGmx,
  },
  {
    name: "Blocksholes",
    imgSrc: LogoPtrBlockscholes,
  },
  {
    name: "GSR",
    imgSrc: LogoPtrGsr,
  },
  {
    name: "Stradle",
    imgSrc: LogoPtrStradle,
  },
  {
    name: "PumpBTC",
    imgSrc: LogoPtrPumpbtc,
  },
  {
    name: "Infrared",
    imgSrc: LogoPtrInfrared,
  },
  {
    name: "D2",
    imgSrc: LogoPtrD2,
  },
  {
    name: "BGT Market",
    imgSrc: LogoPtrBgtmarket,
  },
  {
    name: "Dirac Finance",
    imgSrc: LogoPtrDirac,
  },
  {
    name: "Kodiak",
    imgSrc: LogoPtrKodiak,
  },
  {
    name: "Webera",
    imgSrc: LogoPtrWebera,
  },
  {
    name: "Grix",
    imgSrc: LogoPtrGrix,
  },
  {
    name: "KnightSafe",
    imgSrc: LogoPtrKnightsafe,
  },
  {
    name: "ALFADAO",
    imgSrc: LogoPtrAlfadao,
  },
  {
    name: "UDAO",
    imgSrc: LogoPtrUdao,
  },
];

export const AUDITORS: Partner[] = [
  {
    name: "Hacken",
    website: "https://hacken.io",
    imgSrc: LogoAudHacken,
  },
  {
    name: "Omniscia",
    website: "https://omniscia.io",
    imgSrc: LogoAudOmniscia,
  },
  {
    name: "Pessimistic",
    website: "https://pessimistic.io",
    imgSrc: LogoAudPessimistic,
  },
  {
    name: "PeckShield",
    website: "https://peckshield.com/",
    imgSrc: LogoAudPeckShield,
  },
];
