import IconCheckedMobile from "@assets/mobile/icon-checked-mobile.svg";
import IconUncheckedMobile from "@assets/mobile/icon-unchecked-mobile.svg";

type Props = {
  isChecked: boolean;
  onClick: (...args: any[]) => void;
  text: string;
};
const CheckboxForMobile = ({ isChecked, onClick, text }: Props) => {
  return (
    <label
      onClick={onClick}
      className="cursor-pointer flex flex-row items-center gap-2"
    >
      <img
        className="w-[16px]"
        src={isChecked ? IconCheckedMobile : IconUncheckedMobile}
      />
      <p className="text-[12px] md:text-[14px] leading-[18px] font-bold text-gray9D">
        {text}
      </p>
    </label>
  );
};

export default CheckboxForMobile;
