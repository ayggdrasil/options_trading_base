import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { EntityMetadata } from "typeorm";

// 엔티티 가져오기
import { Position } from "../src/entity/position";
import { PositionHistory } from "../src/entity/positionHistory";
import { CollectFee } from "../src/entity/collectFee";
import { SettlePrice } from "../src/entity/settlePrice";
import { SyncedBlock } from "../src/entity/syncedBlock";
import { DailyNotionalVolumeAndExecutionPrice } from "../src/entity/dailyNotionalVolumeAndExecutionPrice";
import { BuySellUsdg } from "../src/entity/buySellUsdg";
import { AddLiquidity } from "../src/entity/addLiquidity";
import { RemoveLiquidity } from "../src/entity/removeLiquidity";
import { CollectPositionFee } from "../src/entity/collectPositionFee";
import { SyncedRequestIndex } from "../src/entity/syncedRequestIndex";
import { NotifyPendingAmount } from "../src/entity/notifyPendingAmount";
import { FeeRebate } from "../src/entity/feeRebate";
import { CopyTradePositionHistory } from "../src/entity/copyTradePositionHistory";
import { SpvActionItem } from "../src/entity/spvActionItem";

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 엔티티 매핑
const entityMap: Record<string, any> = {
  "position": Position,
  "position-history": PositionHistory,
  "fee-rebate": FeeRebate,
  "collect-fee": CollectFee,
  "collect-position-fee": CollectPositionFee,
  "buy-sell-usdg": BuySellUsdg,
  "add-liquidity": AddLiquidity,
  "remove-liquidity": RemoveLiquidity,
  "settle-price": SettlePrice,
  "daily-notional-volume": DailyNotionalVolumeAndExecutionPrice,
  "synced-request-index": SyncedRequestIndex,
  "synced-block": SyncedBlock,
  "notify-pending-amount": NotifyPendingAmount,
  "copy-trade-position-history": CopyTradePositionHistory,
  "spv-action-item": SpvActionItem,
};

// 엔티티 키 목록 출력
const entityKeys = Object.keys(entityMap);
console.log("사용 가능한 엔티티 목록:");
entityKeys.forEach((key, index) => {
  console.log(`${index + 1}. ${key}`);
});

// 명령행 인수 확인
const entityKey = process.argv[2];
if (!entityKey || !entityMap[entityKey]) {
  console.error(`
에러: 올바른 엔티티 키를 입력하세요.

사용법: npx ts-node scripts/typeorm-migrate-single.ts <엔티티-키> [배치-크기]

예시: 
  npx ts-node scripts/typeorm-migrate-single.ts position
  npx ts-node scripts/typeorm-migrate-single.ts position-history 500

사용 가능한 엔티티 키: ${entityKeys.join(', ')}
`);
  process.exit(1);
}

// 배치 크기 설정
const BATCH_SIZE = parseInt(process.argv[3]) || 1000;

// 로그 파일 설정
const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logStream = fs.createWriteStream(path.join(logDir, `migration-${entityKey}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`));

function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

console.log(`"${entityKey}" 엔티티 마이그레이션 도구 시작... (배치 크기: ${BATCH_SIZE})`);
log(`"${entityKey}" 엔티티 마이그레이션 시작`);

// 선택된 엔티티
const selectedEntity = entityMap[entityKey];

// 데이터 소스 설정
const oldDataSource = new DataSource({
  type: "postgres",
  host: process.env.OLD_AWS_RDS_DB_HOST,
  port: Number(process.env.OLD_AWS_RDS_DB_PORT),
  username: process.env.OLD_AWS_RDS_DB_USER,
  password: process.env.OLD_AWS_RDS_DB_PASSWORD,
  database: process.env.OLD_AWS_RDS_DB_NAME,
  synchronize: false,
  logging: false,
  entities: [selectedEntity],
  connectTimeoutMS: 5000, // 연결 타임아웃 설정
  extra: {
    max: 100,                    // 최대 연결 수 (기본값보다 증가)
    min: 5,                     // 최소 연결 수
    idleTimeoutMillis: 5 * 1000,   // 유휴 연결 유지 시간
    connectionTimeoutMillis: 5* 1000  // 연결 획득 대기 시간
  }
});

const newDataSource = new DataSource({
  type: "postgres",
  host: process.env.AWS_RDS_DB_HOST,
  port: Number(process.env.AWS_RDS_DB_PORT),
  username: process.env.AWS_RDS_DB_USER,
  password: process.env.AWS_RDS_DB_PASSWORD,
  database: process.env.AWS_RDS_DB_NAME,
  synchronize: false,
  logging: false,
  entities: [selectedEntity],
  connectTimeoutMS: 5000, // 연결 타임아웃 설정
  extra: {
    max: 100,                    // 최대 연결 수 (기본값보다 증가)
    min: 5,                     // 최소 연결 수
    idleTimeoutMillis: 5 * 1000,   // 유휴 연결 유지 시간
    connectionTimeoutMillis: 5 * 1000  // 연결 획득 대기 시간
  }
});

// 마이그레이션 통계
const stats = {
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0
};

// 데이터 카운트 함수
async function getDataCount(dataSource: DataSource, entityClass: any) {
  try {
    const repository = dataSource.getRepository(entityClass);
    return await repository.count();
  } catch (error) {
    log(`데이터 개수 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    return -1; // 오류 발생 시 -1 반환
  }
}

// 사용자 확인 프롬프트 함수
async function askQuestion(question: string): Promise<boolean> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise<boolean>((resolve) => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// 스키마 비교 함수
async function compareTableSchema(oldDataSource: DataSource, newDataSource: DataSource, entityMetadata: EntityMetadata) {
  const tableName = entityMetadata.tableName;
  log(`테이블 분석 중: ${tableName}`);

  // 각 데이터베이스에서 컬럼 정보 조회
  const oldColumns = await queryTableColumns(oldDataSource, tableName);
  const newColumns = await queryTableColumns(newDataSource, tableName);

  if (!oldColumns || !newColumns) {
    log(`테이블 ${tableName}를 한쪽 또는 양쪽 데이터베이스에서 찾을 수 없습니다.`);
    return {
      tableName,
      existsInOld: !!oldColumns,
      existsInNew: !!newColumns,
      onlyInOld: [],
      onlyInNew: [],
      different: [],
      identical: [],
    };
  }

  // 컬럼 비교
  const oldColumnNames = Object.keys(oldColumns);
  const newColumnNames = Object.keys(newColumns);

  const onlyInOld = oldColumnNames.filter(col => !newColumnNames.includes(col));
  const onlyInNew = newColumnNames.filter(col => !oldColumnNames.includes(col));
  
  const commonColumns = oldColumnNames.filter(col => newColumnNames.includes(col));
  
  const different: { column: string; oldType: string; newType: string }[] = [];
  const identical: string[] = [];

  for (const col of commonColumns) {
    if (oldColumns[col].dataType !== newColumns[col].dataType ||
        oldColumns[col].isNullable !== newColumns[col].isNullable ||
        oldColumns[col].characterMaximumLength !== newColumns[col].characterMaximumLength) {
      different.push({
        column: col,
        oldType: formatColumnType(oldColumns[col]),
        newType: formatColumnType(newColumns[col]),
      });
    } else {
      identical.push(col);
    }
  }

  return {
    tableName,
    existsInOld: true,
    existsInNew: true,
    onlyInOld,
    onlyInNew,
    different,
    identical,
  };
}

async function queryTableColumns(dataSource: DataSource, tableName: string) {
  try {
    const columns = await dataSource.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable = 'YES' as is_nullable,
        character_maximum_length
      FROM 
        information_schema.columns
      WHERE 
        table_name = $1
        AND table_schema = 'public'
    `, [tableName]);

    if (columns.length === 0) {
      return null;
    }

    const result: Record<string, any> = {};
    for (const col of columns) {
      result[col.column_name] = {
        dataType: col.data_type,
        isNullable: col.is_nullable,
        characterMaximumLength: col.character_maximum_length,
      };
    }
    return result;
  } catch (error) {
    log(`테이블 ${tableName}의 컬럼 정보를 가져오는 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function formatColumnType(column: { dataType: string, isNullable: boolean, characterMaximumLength: number | null }) {
  let type = column.dataType;
  if (column.characterMaximumLength) {
    type += `(${column.characterMaximumLength})`;
  }
  if (!column.isNullable) {
    type += ' NOT NULL';
  }
  return type;
}

// 마이그레이션 함수
async function migrateEntity<T extends { id: string | number }>(
  entityClass: any,
  oldRepo: any,
  newRepo: any
) {
  // 전체 레코드 수 계산
  const totalCount = await oldRepo.count();
  stats.total = totalCount;
  log(`총 ${totalCount}개의 레코드를 마이그레이션합니다.`);

  // ID 기준으로 배치 처리
  let processed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 사용자 확인
  const continueWithMigration = await askQuestion(`${totalCount}개의 레코드를 마이그레이션합니다. 계속하시겠습니까? (y/n) `);
  if (!continueWithMigration) {
    log('마이그레이션이 취소되었습니다.');
    process.exit(0);
  }

  // 페이지네이션 처리
  let page = 0;
  while (processed < totalCount) {
    const skip = page * BATCH_SIZE;
    const records = await oldRepo.find({
      skip,
      take: BATCH_SIZE,
      order: { id: "ASC" },
    });

    if (records.length === 0) break;

    let batchSkipped = 0;
    let batchErrors = 0;

    // 이미 존재하는 ID 확인 (대량 삽입 전 체크)
    const recordIds = records.map((record: any) => record.id);
    const existingRecords = await newRepo.find({
      where: recordIds.map((id: string | number) => ({ id })),
      select: ["id"],
    });
    const existingIds = new Set(existingRecords.map((record: any) => record.id));

    // 존재하지 않는 레코드만 필터링
    const recordsToInsert = records.filter((record: any) => !existingIds.has(record.id));

    if (recordsToInsert.length > 0) {
      try {
        // 대량 삽입 수행
        await newDataSource.createQueryRunner().manager.save(entityClass, recordsToInsert);
        processed += recordsToInsert.length;
        log(`배치 ${page + 1} 처리 완료. ${recordsToInsert.length}개 중 ${recordsToInsert.length}개 삽입됨. (총 진행률: ${Math.round((processed / totalCount) * 100)}%)`);
      } catch (error) {
        log(`배치 ${page + 1} 처리 중 오류 발생.`);
        log(`오류 메시지: ${error instanceof Error ? error.message : String(error)}`);

        // 개별 레코드 단위로 재시도
        for (const record of recordsToInsert) {
          try {
            await newRepo.save(record);
            processed++;
          } catch (recordError) {
            log(`ID ${record.id} 레코드 처리 중 오류: ${recordError instanceof Error ? recordError.message : String(recordError)}`);
            batchErrors++;
          }
        }
      }
    } else {
      batchSkipped += records.length;
      log(`배치 ${page + 1}의 모든 레코드(${records.length}개)가 이미 대상 DB에 존재함.`);
    }

    batchSkipped += records.length - recordsToInsert.length;
    totalSkipped += batchSkipped;
    totalErrors += batchErrors;

    page++;
  }

  // 통계 업데이트
  stats.processed = processed;
  stats.skipped = totalSkipped;
  stats.errors = totalErrors;

  log(`마이그레이션 완료: ${entityKey}`);
  log(`처리됨: ${processed}, 건너뜀: ${totalSkipped}, 오류: ${totalErrors}`);
}

// 메인 함수
async function main() {
  let oldDbConnected = false;
  let newDbConnected = false;

  try {
    // OLD 데이터베이스 연결
    log("OLD 데이터베이스 연결 중...");
    try {
      await oldDataSource.initialize();
      log("OLD 데이터베이스 연결됨");
      oldDbConnected = true;
    } catch (error) {
      log(`OLD 데이터베이스 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      log("프로그램을 종료합니다.");
      return;
    }

    // NEW 데이터베이스 연결
    log("NEW 데이터베이스 연결 중...");
    try {
      await newDataSource.initialize();
      log("NEW 데이터베이스 연결됨");
      newDbConnected = true;
    } catch (error) {
      log(`NEW 데이터베이스 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      log("프로그램을 종료합니다.");
      return;
    }

    // 엔티티 메타데이터 가져오기
    const entityMetadata = oldDataSource.getMetadata(selectedEntity);
    
    // 데이터 개수 조회
    const oldDataCount = await getDataCount(oldDataSource, selectedEntity);
    const newDataCount = await getDataCount(newDataSource, selectedEntity);
    
    // 스키마 비교 수행
    log("\n스키마 비교 중...");
    const schemaComparisonResult = await compareTableSchema(oldDataSource, newDataSource, entityMetadata);
    
    // 스키마 비교 결과 출력
    log("\n스키마 비교 결과:");
    log(`테이블: ${schemaComparisonResult.tableName}`);
    log(`  OLD DB 존재: ${schemaComparisonResult.existsInOld ? 'Yes' : 'No'}`);
    log(`  NEW DB 존재: ${schemaComparisonResult.existsInNew ? 'Yes' : 'No'}`);
    
    // 데이터 개수 정보 출력
    log("\n데이터 개수 정보:");
    log(`  OLD DB 데이터 개수: ${oldDataCount >= 0 ? oldDataCount : '조회 실패'}`);
    log(`  NEW DB 데이터 개수: ${newDataCount >= 0 ? newDataCount : '조회 실패'}`);
    
    // 마이그레이션 예상 데이터 계산
    if (oldDataCount >= 0 && newDataCount >= 0) {
      const duplicateEstimate = await estimateDuplicateCount(oldDataSource, newDataSource, selectedEntity);
      const expectedMigration = oldDataCount - duplicateEstimate;
      log(`  마이그레이션 예상 데이터: ${expectedMigration}개`);
      log(`  중복 예상 데이터: ${duplicateEstimate}개`);
    }
    
    if (schemaComparisonResult.existsInOld && schemaComparisonResult.existsInNew) {
      log(`\n스키마 상세 정보:`);
      log(`  동일한 컬럼 수: ${schemaComparisonResult.identical.length}`);
      
      if (schemaComparisonResult.onlyInOld.length > 0) {
        log(`  OLD DB에만 존재하는 컬럼: ${schemaComparisonResult.onlyInOld.join(', ')}`);
      }
      
      if (schemaComparisonResult.onlyInNew.length > 0) {
        log(`  NEW DB에만 존재하는 컬럼: ${schemaComparisonResult.onlyInNew.join(', ')}`);
      }
      
      if (schemaComparisonResult.different.length > 0) {
        log(`  타입이 다른 컬럼:`);
        for (const diff of schemaComparisonResult.different) {
          log(`    ${diff.column}: OLD(${diff.oldType}) vs NEW(${diff.newType})`);
        }
      }
    }

    // 마이그레이션 이슈 분석
    const migrationIssues: string[] = [];
    let hasCriticalIssue = false;

    if (!schemaComparisonResult.existsInNew) {
      migrationIssues.push(`테이블 ${schemaComparisonResult.tableName}이(가) NEW 데이터베이스에 존재하지 않습니다.`);
      hasCriticalIssue = true;
    } else {
      if (schemaComparisonResult.onlyInOld.length > 0) {
        migrationIssues.push(`OLD DB 전용 컬럼 ${schemaComparisonResult.onlyInOld.join(', ')}는 NEW DB에서 무시됩니다.`);
      }
      
      for (const diff of schemaComparisonResult.different) {
        migrationIssues.push(`컬럼 ${diff.column}의 타입이 다릅니다: OLD(${diff.oldType}) vs NEW(${diff.newType}). 데이터 변환이 필요할 수 있습니다.`);
      }
    }

    // 마이그레이션 이슈 출력
    if (migrationIssues.length > 0) {
      log("\n마이그레이션 시 고려해야 할 이슈:");
      for (const issue of migrationIssues) {
        log(`- ${issue}`);
      }
    } else {
      log("\n마이그레이션 이슈가 없습니다. 안전하게 진행 가능합니다.");
    }

    // 치명적인 이슈가 있는 경우 경고
    if (hasCriticalIssue) {
      log("\n경고: 치명적인 이슈가 발견되었습니다. 마이그레이션을 진행하지 않는 것이 좋습니다.");
      const forceContinue = await askQuestion("치명적인 이슈에도 불구하고 계속 진행하시겠습니까? (y/n) ");
      if (!forceContinue) {
        log("마이그레이션이 취소되었습니다.");
        return;
      }
    } else {
      // 스키마 비교 후 사용자 확인
      const continueAfterComparison = await askQuestion("\n스키마 비교 결과를 확인했습니다. 마이그레이션을 계속 진행하시겠습니까? (y/n) ");
      if (!continueAfterComparison) {
        log("마이그레이션이 취소되었습니다.");
        return;
      }
    }

    // 선택된 엔티티 마이그레이션
    log("\n마이그레이션을 시작합니다...");
    const oldRepo = oldDataSource.getRepository(selectedEntity);
    const newRepo = newDataSource.getRepository(selectedEntity);
    await migrateEntity(selectedEntity, oldRepo, newRepo);

    // 결과 요약
    log("\n마이그레이션 요약:");
    log(`엔티티: ${entityKey}`);
    log(`총 레코드: ${stats.total}`);
    log(`처리됨: ${stats.processed}`);
    log(`건너뜀: ${stats.skipped}`);
    log(`오류: ${stats.errors}`);
    log(`성공률: ${stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%`);

    log("마이그레이션 완료!");
  } catch (error) {
    log(`마이그레이션 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 연결 종료
    if (oldDbConnected && oldDataSource.isInitialized) await oldDataSource.destroy();
    if (newDbConnected && newDataSource.isInitialized) await newDataSource.destroy();
    logStream.end();
  }
}

// 중복 데이터 예상 개수 추정 함수
async function estimateDuplicateCount(oldDataSource: DataSource, newDataSource: DataSource, entityClass: any) {
  try {
    // 랜덤 샘플 추출
    const oldRepo = oldDataSource.getRepository(entityClass);
    const newRepo = newDataSource.getRepository(entityClass);
    
    const totalRecords = await oldRepo.count();
    if (totalRecords === 0) return 0;
    
    // 샘플 크기 결정 (최대 100개)
    const sampleSize = Math.min(100, totalRecords);
    
    // 랜덤 오프셋 사용
    const randomOffset = Math.floor(Math.random() * (totalRecords - sampleSize));
    
    // 샘플 데이터 가져오기
    const sampleRecords = await oldRepo.find({
      skip: randomOffset,
      take: sampleSize,
      select: ["id"]
    });
    
    // 샘플 ID 추출
    const sampleIds = sampleRecords.map(record => record.id);
    
    // 중복 확인
    const existingRecords = await newRepo.find({
      where: sampleIds.map((id: string | number) => ({ id })),
      select: ["id"]
    });
    
    // 중복률 계산
    const duplicateRate = existingRecords.length / sampleSize;
    
    // 전체 중복 예상 개수
    return Math.round(totalRecords * duplicateRate);
  } catch (error) {
    log(`중복 데이터 추정 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

// 스크립트 실행
main().catch(error => {
  console.error("마이그레이션 실패:", error);
  process.exit(1);
}); 