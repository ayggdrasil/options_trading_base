import OpenPositionsTableHead from "./OpenPositionsTableHead";
import OpenPositionsTableBody from "./OpenPositionsTableBody";
import { PositionStats } from "../utils/calculations";
import { FlattenedPosition } from "@/interfaces/interfaces.positionSlice";
import TablePagination from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface OpenPositionsTableProps {
  positionStats: PositionStats;
  flattenedPositions: FlattenedPosition[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

function OpenPositionsTable({
  positionStats,
  flattenedPositions,
  currentPage,
  setCurrentPage,
  totalPages,
}: OpenPositionsTableProps) {
  // 페이지가 변경될 때 호출되는 함수
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 현재 페이지에 표시할 데이터 필터링
  const paginatedPositions = flattenedPositions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col w-full">
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={flattenedPositions.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
      />
      <OpenPositionsTableHead />
      <OpenPositionsTableBody
        positionStats={positionStats}
        flattenedPositions={paginatedPositions}
      />
    </div>
  );
}

export default OpenPositionsTable;
