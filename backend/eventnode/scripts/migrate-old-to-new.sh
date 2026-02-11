#!/bin/bash

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 디렉토리 생성
mkdir -p logs

echo -e "${BLUE}데이터베이스 마이그레이션 도구${NC}"
echo "이 스크립트는 OLD 데이터베이스에서 NEW 데이터베이스로 데이터를 마이그레이션합니다."
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

echo -e "${YELLOW}마이그레이션 단계:${NC}"
echo "1. 스키마 비교"
echo "2. TypeORM 마이그레이션 실행"
echo "3. PostgreSQL 직접 마이그레이션 실행"
echo "4. 모든 단계 실행"
echo "0. 종료"

read -p "실행할 단계를 선택하세요 (0-4): " choice
echo

case $choice in
  1)
    echo -e "${GREEN}스키마 비교 실행 중...${NC}"
    npx ts-node scripts/schema-compare.ts
    ;;
  2)
    echo -e "${GREEN}TypeORM 마이그레이션 실행 중...${NC}"
    npx ts-node scripts/typeorm-migrate.ts
    ;;
  3)
    echo -e "${GREEN}PostgreSQL 직접 마이그레이션 실행 중...${NC}"
    bash scripts/migrate-db.sh
    ;;
  4)
    echo -e "${GREEN}모든 단계 실행 중...${NC}"
    echo -e "${YELLOW}1. 스키마 비교 실행 중...${NC}"
    npx ts-node scripts/schema-compare.ts
    
    echo
    read -p "스키마 비교 결과를 확인했습니다. 계속 진행하시겠습니까? (y/n): " continue
    if [[ $continue != "y" && $continue != "Y" ]]; then
      echo "마이그레이션을 중단합니다."
      exit 0
    fi
    
    echo -e "${YELLOW}2. TypeORM 마이그레이션 실행 중...${NC}"
    npx ts-node scripts/typeorm-migrate.ts
    
    echo
    read -p "TypeORM 마이그레이션이 완료되었습니다. PostgreSQL 직접 마이그레이션도 실행하시겠습니까? (y/n): " continue
    if [[ $continue != "y" && $continue != "Y" ]]; then
      echo "PostgreSQL 직접 마이그레이션을 건너뜁니다."
    else
      echo -e "${YELLOW}3. PostgreSQL 직접 마이그레이션 실행 중...${NC}"
      bash scripts/migrate-db.sh
    fi
    
    echo -e "${GREEN}마이그레이션이 완료되었습니다.${NC}"
    ;;
  0)
    echo "종료합니다."
    exit 0
    ;;
  *)
    echo -e "${RED}잘못된 선택입니다. 0-4 사이의 숫자를 입력하세요.${NC}"
    exit 1
    ;;
esac

echo -e "${GREEN}작업이 완료되었습니다. 로그 파일은 logs 디렉토리에서 확인할 수 있습니다.${NC}" 