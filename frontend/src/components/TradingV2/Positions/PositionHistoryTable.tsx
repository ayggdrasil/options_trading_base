import { PositionHistoryWithMetadata } from "@/store/slices/PositionHistorySlice";
import TablePagination from "./TablePagination";
import PositionHistoryTableHead from "./PositionHistoryTableHead";
import PositionHistoryTableBody from "./PositionHistoryTableBody";

const ITEMS_PER_PAGE = 8;

interface PositionHistoryTableProps {
  history: PositionHistoryWithMetadata[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

function PositionHistoryTable({
  history,
  currentPage,
  setCurrentPage,
  totalPages,
}: PositionHistoryTableProps) {
  // 페이지가 변경될 때 호출되는 함수
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 현재 페이지에 표시할 데이터 필터링
  const paginatedHistory = history.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col w-full">
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={history.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
      />
      <PositionHistoryTableHead />
      <PositionHistoryTableBody history={paginatedHistory} />
    </div>
  );
}

export default PositionHistoryTable;
