#!/bin/bash

# 환경 변수 설정
OLD_DB_HOST="${OLD_AWS_RDS_DB_HOST:-localhost}"
OLD_DB_PORT="${OLD_AWS_RDS_DB_PORT:-5432}"
OLD_DB_USER="${OLD_AWS_RDS_DB_USER:-postgres}"
OLD_DB_PASS="${OLD_AWS_RDS_DB_PASSWORD:-postgres}"
OLD_DB_NAME="${OLD_AWS_RDS_DB_NAME:-callput_common}"

NEW_DB_HOST="${AWS_RDS_DB_HOST:-localhost}"
NEW_DB_PORT="${AWS_RDS_DB_PORT:-5432}"
NEW_DB_USER="${AWS_RDS_DB_USER:-postgres}"
NEW_DB_PASS="${AWS_RDS_DB_PASSWORD:-postgres}"
NEW_DB_NAME="${AWS_RDS_DB_NAME:-callput_common}"

TEMP_DIR="./migration_temp"
mkdir -p $TEMP_DIR

echo "시작: OLD 데이터베이스에서 데이터 추출"

# 엔티티 목록
ENTITIES=(
  "position"
  "position_history"
  "fee_rebate"
  "collect_fee"
  "collect_position_fee"
  "buy_sell_usdg"
  "add_liquidity"
  "remove_liquidity"
  "settle_price"
  "daily_notional_volume_and_execution_price"
  "synced_request_index"
  "synced_block"
  "notify_pending_amount"
  "copy_trade_position_history"
  "spv_action_item"
)

# 각 테이블에 대해 데이터 추출 및 마이그레이션
for ENTITY in "${ENTITIES[@]}"; do
  echo "마이그레이션 중: $ENTITY"
  
  # OLD 데이터베이스에서 테이블 구조 확인
  OLD_COLS=$(PGPASSWORD=$OLD_DB_PASS psql -h $OLD_DB_HOST -p $OLD_DB_PORT -U $OLD_DB_USER -d $OLD_DB_NAME -t -c "\d $ENTITY" | grep -E '^\s+[a-z_]+\s+' | awk '{print $1}' | tr '\n' ',' | sed 's/,$//')
  
  # NEW 데이터베이스에서 테이블 구조 확인
  NEW_COLS=$(PGPASSWORD=$NEW_DB_PASS psql -h $NEW_DB_HOST -p $NEW_DB_PORT -U $NEW_DB_USER -d $NEW_DB_NAME -t -c "\d $ENTITY" | grep -E '^\s+[a-z_]+\s+' | awk '{print $1}' | tr '\n' ',' | sed 's/,$//')
  
  # 공통 컬럼 찾기
  COMMON_COLS=$(echo "$OLD_COLS,$NEW_COLS" | tr ',' '\n' | sort | uniq -d | tr '\n' ',' | sed 's/,$//')
  
  if [ -z "$COMMON_COLS" ]; then
    echo "  경고: $ENTITY 테이블에서 공통 컬럼을 찾을 수 없습니다."
    continue
  fi
  
  # OLD 데이터베이스에서 데이터 추출
  echo "  데이터 추출 중: $ENTITY"
  PGPASSWORD=$OLD_DB_PASS psql -h $OLD_DB_HOST -p $OLD_DB_PORT -U $OLD_DB_USER -d $OLD_DB_NAME -c "\COPY (SELECT $COMMON_COLS FROM $ENTITY) TO '$TEMP_DIR/$ENTITY.csv' WITH CSV HEADER;"
  
  # 중복 ID 확인을 위해 NEW 데이터베이스에서 ID 추출
  echo "  중복 ID 확인 중"
  PGPASSWORD=$NEW_DB_PASS psql -h $NEW_DB_HOST -p $NEW_DB_PORT -U $NEW_DB_USER -d $NEW_DB_NAME -c "\COPY (SELECT id FROM $ENTITY) TO '$TEMP_DIR/${ENTITY}_new_ids.csv' WITH CSV HEADER;"
  
  # 중복 ID가 없는 레코드만 필터링
  echo "  중복 제거 중"
  python3 -c "
import csv, os
with open('$TEMP_DIR/$ENTITY.csv', 'r') as f_in, \
     open('$TEMP_DIR/${ENTITY}_new_ids.csv', 'r') as f_ids, \
     open('$TEMP_DIR/${ENTITY}_filtered.csv', 'w') as f_out:
    reader = csv.DictReader(f_in)
    id_reader = csv.DictReader(f_ids)
    writer = csv.DictWriter(f_out, fieldnames=reader.fieldnames)
    writer.writeheader()
    
    new_ids = set(row['id'] for row in id_reader)
    filtered = 0
    total = 0
    
    for row in reader:
        total += 1
        if row['id'] not in new_ids:
            writer.writerow(row)
        else:
            filtered += 1
    
    print(f'  {filtered} 중복 레코드 필터링 (총 {total} 중)')
  "
  
  # NEW 데이터베이스로 데이터 삽입
  echo "  데이터 삽입 중: $ENTITY"
  PGPASSWORD=$NEW_DB_PASS psql -h $NEW_DB_HOST -p $NEW_DB_PORT -U $NEW_DB_USER -d $NEW_DB_NAME -c "\COPY $ENTITY($COMMON_COLS) FROM '$TEMP_DIR/${ENTITY}_filtered.csv' WITH CSV HEADER;"
  
  echo "  완료: $ENTITY"
done

# 임시 파일 정리
rm -rf $TEMP_DIR

echo "마이그레이션 완료!" 