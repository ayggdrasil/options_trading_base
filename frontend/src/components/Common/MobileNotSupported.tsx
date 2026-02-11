import { useNavigate } from "react-router-dom";
import LogoCallPut from "@assets/img/logo-callput.png";
import Button from "./Button";

const MobileNotSupported = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-black181a flex justify-center">
      <div className="w-full max-w-[393px] flex flex-col gap-[24px] py-[80px]">
        {/* Logo and App Name */}
        <div className="flex flex-row items-center px-[28px]">
          <img src={LogoCallPut} alt="CallPut Logo" className="w-[192px]" />
        </div>

        <div className="flex flex-col gap-[36px] px-[28px]">
          {/* Headline */}
          <h2 className="text-whitef2f2 text-[36px] font-[400] leading-[45px] tracking-[-1px]">
            Permissionless 24/7
            <br />
            On-Chain Options for
            <br />
            US Stocks & Crypto
          </h2>

          {/* Message */}
          <p className="text-whitef2f2 text-[16px] font-[400] leading-[23px]">
            CallPut.app is not supporting mobile yet.
            <br />
            Please come again later.
          </p>

          {/* Go Back Button */}
          <div className="w-[94px] h-[40px]">
            <Button
              name="Go back"
              color="blue"
              onClick={handleGoBack}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileNotSupported;
