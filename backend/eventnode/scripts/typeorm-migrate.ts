import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

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

console.log("데이터베이스 마이그레이션 도구 시작...");

// 로그 파일 설정
const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logStream = fs.createWriteStream(path.join(logDir, `migration-${new Date().toISOString().replace(/[:.]/g, '-')}.log`));

function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// 엔티티 목록
const entities = [
  Position,
  PositionHistory,
  FeeRebate,
  CollectFee,
  CollectPositionFee,
  BuySellUsdg,
  AddLiquidity,
  RemoveLiquidity,
  SettlePrice,
  DailyNotionalVolumeAndExecutionPrice,
  SyncedRequestIndex,
  SyncedBlock,
  NotifyPendingAmount,
  CopyTradePositionHistory,
  SpvActionItem,
];

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
  entities,
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
  entities,
});

// 각 엔티티별 마이그레이션 정보를 저장하는 객체
const migrationStats: Record<string, { total: number; processed: number; skipped: number; errors: number }> = {};

// 배치 크기
const BATCH_SIZE = 1000;

// 마이그레이션 함수
async function migrateEntity<T extends { id: string | number }>(
  entityClass: any,
  oldRepo: any,
  newRepo: any
) {
  const entityName = entityClass.name;
  log(`마이그레이션 시작: ${entityName}`);

  // 통계 초기화
  migrationStats[entityName] = { total: 0, processed: 0, skipped: 0, errors: 0 };

  // 전체 레코드 수 계산
  const totalCount = await oldRepo.count();
  migrationStats[entityName].total = totalCount;
  log(`총 ${totalCount}개의 레코드를 마이그레이션합니다.`);

  // ID 기준으로 배치 처리
  let processed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

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
        log(`${entityName}: 배치 ${page + 1} 처리 완료. ${recordsToInsert.length}개 중 ${recordsToInsert.length}개 삽입됨.`);
      } catch (error) {
        log(`${entityName}: 배치 ${page + 1} 처리 중 오류 발생.`);
        log(`오류 메시지: ${error instanceof Error ? error.message : String(error)}`);

        // 개별 레코드 단위로 재시도
        for (const record of recordsToInsert) {
          try {
            await newRepo.save(record);
            processed++;
          } catch (recordError) {
            log(`${entityName}: ID ${record.id} 레코드 처리 중 오류: ${recordError instanceof Error ? recordError.message : String(recordError)}`);
            batchErrors++;
          }
        }
      }
    } else {
      batchSkipped += records.length;
      log(`${entityName}: 배치 ${page + 1}의 모든 레코드(${records.length}개)가 이미 대상 DB에 존재함.`);
    }

    batchSkipped += records.length - recordsToInsert.length;
    totalSkipped += batchSkipped;
    totalErrors += batchErrors;

    page++;
  }

  // 통계 업데이트
  migrationStats[entityName].processed = processed;
  migrationStats[entityName].skipped = totalSkipped;
  migrationStats[entityName].errors = totalErrors;

  log(`마이그레이션 완료: ${entityName}`);
  log(`처리됨: ${processed}, 건너뜀: ${totalSkipped}, 오류: ${totalErrors}`);
}

// 메인 함수
async function main() {
  try {
    log("OLD 데이터베이스 연결 중...");
    await oldDataSource.initialize();
    log("OLD 데이터베이스 연결됨");

    log("NEW 데이터베이스 연결 중...");
    await newDataSource.initialize();
    log("NEW 데이터베이스 연결됨");

    // 각 엔티티 마이그레이션
    for (const entity of entities) {
      const oldRepo = oldDataSource.getRepository(entity);
      const newRepo = newDataSource.getRepository(entity);
      await migrateEntity(entity, oldRepo, newRepo);
    }

    // 전체 통계 출력
    log("\n마이그레이션 요약:");
    let totalRecords = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const entityName in migrationStats) {
      const stats = migrationStats[entityName];
      totalRecords += stats.total;
      totalProcessed += stats.processed;
      totalSkipped += stats.skipped;
      totalErrors += stats.errors;

      log(`${entityName}: 총 ${stats.total}, 처리됨 ${stats.processed}, 건너뜀 ${stats.skipped}, 오류 ${stats.errors}`);
    }

    log(`\n전체 합계: 총 ${totalRecords}, 처리됨 ${totalProcessed}, 건너뜀 ${totalSkipped}, 오류 ${totalErrors}`);
    log("마이그레이션 완료!");
  } catch (error) {
    log(`마이그레이션 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 연결 종료
    if (oldDataSource.isInitialized) await oldDataSource.destroy();
    if (newDataSource.isInitialized) await newDataSource.destroy();
    logStream.end();
  }
}

// 스크립트 실행
main().catch(error => {
  console.error("마이그레이션 실패:", error);
  process.exit(1);
}); 