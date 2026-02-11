import PositionTableOpenHead from "./PositionTableOpenHead";
import PositionTableOpenBody from "./PositionTableOpenBody";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";

interface PositionTableOpenProps {
  flattenedPositions: FlattenedPosition[];
}

const PositionTableOpen: React.FC<PositionTableOpenProps> = ({
  flattenedPositions
}) => {
  return (<>
    <PositionTableOpenHead/>
    <div className="w-full h-[1px] bg-black29 mt-[16px]"/>
    <PositionTableOpenBody
      flattenedPositions={flattenedPositions}
    />
  </>);
};

export default PositionTableOpen;