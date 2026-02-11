#!/bin/bash

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 디렉토리 생성
mkdir -p logs

echo -e "${BLUE}단일 엔티티 데이터베이스 마이그레이션 도구${NC}"
echo "이 스크립트는 OLD 데이터베이스에서 NEW 데이터베이스로 선택한 엔티티의 데이터를 마이그레이션합니다."
echo

# 환경 변수 확인
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env 파일이 프로젝트 루트에 없습니다.${NC}"
  echo "다음 내용으로 .env 파일을 생성하세요:"
  echo
  echo "# OLD 데이터베이스 설정"
  echo "OLD_AWS_RDS_DB_HOST=old-db-host"
  echo "OLD_AWS_RDS_DB_PORT=5432"
  echo "OLD_AWS_RDS_DB_USER=username"
  echo "OLD_AWS_RDS_DB_PASSWORD=password"
  echo "OLD_AWS_RDS_DB_NAME=callput_common"
  echo
  echo "# NEW 데이터베이스 설정"
  echo "AWS_RDS_DB_HOST=new-db-host"
  echo "AWS_RDS_DB_PORT=5432"
  echo "AWS_RDS_DB_USER=username"
  echo "AWS_RDS_DB_PASSWORD=password"
  echo "AWS_RDS_DB_NAME=callput_common"
  exit 1
fi

echo -e "${YELLOW}사용 가능한 엔티티 목록:${NC}"
# TypeScript 스크립트를 실행하여 엔티티 목록을 가져옴
ENTITY_LIST=$(npx ts-node -e "
import { Position } from '../src/entity/position';
import { PositionHistory } from '../src/entity/positionHistory';
import { CollectFee } from '../src/entity/collectFee';
import { SettlePrice } from '../src/entity/settlePrice';
import { SyncedBlock } from '../src/entity/syncedBlock';
import { DailyNotionalVolumeAndExecutionPrice } from '../src/entity/dailyNotionalVolumeAndExecutionPrice';
import { BuySellUsdg } from '../src/entity/buySellUsdg';
import { AddLiquidity } from '../src/entity/addLiquidity';
import { RemoveLiquidity } from '../src/entity/removeLiquidity';
import { CollectPositionFee } from '../src/entity/collectPositionFee';
import { SyncedRequestIndex } from '../src/entity/syncedRequestIndex';
import { NotifyPendingAmount } from '../src/entity/notifyPendingAmount';
import { FeeRebate } from '../src/entity/feeRebate';
import { CopyTradePositionHistory } from '../src/entity/copyTradePositionHistory';
import { SpvActionItem } from '../src/entity/spvActionItem';

const entityMap = {
  'position': Position,
  'position-history': PositionHistory,
  'fee-rebate': FeeRebate,
  'collect-fee': CollectFee,
  'collect-position-fee': CollectPositionFee,
  'buy-sell-usdg': BuySellUsdg,
  'add-liquidity': AddLiquidity,
  'remove-liquidity': RemoveLiquidity,
  'settle-price': SettlePrice,
  'daily-notional-volume': DailyNotionalVolumeAndExecutionPrice,
  'synced-request-index': SyncedRequestIndex,
  'synced-block': SyncedBlock,
  'notify-pending-amount': NotifyPendingAmount,
  'copy-trade-position-history': CopyTradePositionHistory,
  'spv-action-item': SpvActionItem,
};

Object.keys(entityMap).forEach((key, index) => {
  console.log(\`\${index + 1}. \${key}\`);
});
")

echo "$ENTITY_LIST"
echo

# 인터랙티브 모드
if [ "$1" == "" ]; then
  read -p "마이그레이션할 엔티티를 선택하세요 (이름 또는 번호): " ENTITY_CHOICE
  
  # 숫자로 입력된 경우 이름으로 변환
  if [[ "$ENTITY_CHOICE" =~ ^[0-9]+$ ]]; then
    # 선택한 번호에 해당하는 엔티티 이름을 추출
    ENTITY_NAME=$(echo "$ENTITY_LIST" | sed -n "${ENTITY_CHOICE}p" | cut -d. -f2- | xargs)
  else
    ENTITY_NAME="$ENTITY_CHOICE"
  fi
  
  read -p "배치 크기를 입력하세요 (기본값: 1000): " BATCH_SIZE
  BATCH_SIZE=${BATCH_SIZE:-1000}
else
  ENTITY_NAME="$1"
  BATCH_SIZE=${2:-1000}
fi

echo -e "${GREEN}선택한 엔티티: ${ENTITY_NAME}, 배치 크기: ${BATCH_SIZE}${NC}"
echo

# 마이그레이션 실행 (스키마 비교 및 마이그레이션을 한 번에 처리)
echo -e "${YELLOW}${ENTITY_NAME} 엔티티 마이그레이션 시작...${NC}"
npx ts-node scripts/typeorm-migrate-single.ts "$ENTITY_NAME" "$BATCH_SIZE"

echo -e "${GREEN}작업이 완료되었습니다. 로그 파일은 logs 디렉토리에서 확인할 수 있습니다.${NC}"