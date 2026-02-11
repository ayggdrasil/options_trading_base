import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { EntityMetadata } from "typeorm";

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("데이터베이스 스키마 비교 도구 시작...");

// 로그 파일 설정
const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logStream = fs.createWriteStream(path.join(logDir, `schema-compare-${new Date().toISOString().replace(/[:.]/g, '-')}.log`));

function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// src/entity 폴더에서 모든 엔티티 파일 가져오기
const entityDir = path.resolve(__dirname, '../src/entity');
const entityFiles = fs.readdirSync(entityDir)
  .filter(file => file.endsWith('.ts') && file !== 'base.ts')
  .map(file => path.join(entityDir, file));

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
  entities: entityFiles,
  connectTimeoutMS: 5000, // 연결 타임아웃 5초로 설정
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
  entities: entityFiles,
  connectTimeoutMS: 5000, // 연결 타임아웃 5초로 설정
});

// 테이블 스키마 비교 함수
async function compareTableSchema(
  oldDataSource: DataSource,
  newDataSource: DataSource,
  entityMetadata: EntityMetadata
) {
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

  // 인덱스 비교는 추가 구현 가능

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

// OLD DB 연결 없이 진행할지 여부를 확인하는 함수
async function askToSkipOldDb() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise<boolean>((resolve) => {
    readline.question('OLD 데이터베이스에 연결할 수 없습니다. OLD DB 없이 계속 진행하시겠습니까? (y/n): ', (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// 메인 함수
async function main() {
  let oldDbConnected = false;
  let newDbConnected = false;

  try {
    log("OLD 데이터베이스 연결 중...");
    try {
      await oldDataSource.initialize();
      log("OLD 데이터베이스 연결됨");
      oldDbConnected = true;
    } catch (error) {
      log(`OLD 데이터베이스 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      const continueWithoutOldDb = await askToSkipOldDb();
      if (!continueWithoutOldDb) {
        log("프로그램을 종료합니다.");
        return;
      }
    }

    log("NEW 데이터베이스 연결 중...");
    await newDataSource.initialize();
    log("NEW 데이터베이스 연결됨");
    newDbConnected = true;

    // 결과 저장을 위한 배열
    const comparisonResults: any[] = [];
    const migrationIssues: string[] = [];

    if (oldDbConnected) {
      // 모든 엔티티 스키마 비교
      for (const entity of oldDataSource.entityMetadatas) {
        const result = await compareTableSchema(oldDataSource, newDataSource, entity);
        comparisonResults.push(result);

        // 마이그레이션 이슈 분석
        if (!result.existsInNew) {
          migrationIssues.push(`테이블 ${result.tableName}이(가) NEW 데이터베이스에 존재하지 않습니다.`);
        } else {
          if (result.onlyInOld.length > 0) {
            migrationIssues.push(`테이블 ${result.tableName}의 컬럼 ${result.onlyInOld.join(', ')}이(가) OLD 데이터베이스에만 존재합니다.`);
          }
          
          for (const diff of result.different) {
            migrationIssues.push(`테이블 ${result.tableName}의 컬럼 ${diff.column}의 타입이 다릅니다: OLD(${diff.oldType}) vs NEW(${diff.newType})`);
          }
        }
      }

      // 결과 요약
      log("\n스키마 비교 결과 요약:");
      for (const result of comparisonResults) {
        log(`테이블: ${result.tableName}`);
        log(`  OLD DB 존재: ${result.existsInOld ? 'Yes' : 'No'}`);
        log(`  NEW DB 존재: ${result.existsInNew ? 'Yes' : 'No'}`);
        
        if (result.existsInOld && result.existsInNew) {
          log(`  동일한 컬럼 수: ${result.identical.length}`);
          
          if (result.onlyInOld.length > 0) {
            log(`  OLD DB에만 존재하는 컬럼: ${result.onlyInOld.join(', ')}`);
          }
          
          if (result.onlyInNew.length > 0) {
            log(`  NEW DB에만 존재하는 컬럼: ${result.onlyInNew.join(', ')}`);
          }
          
          if (result.different.length > 0) {
            log(`  타입이 다른 컬럼:`);
            for (const diff of result.different) {
              log(`    ${diff.column}: OLD(${diff.oldType}) vs NEW(${diff.newType})`);
            }
          }
        }
        
        log(''); // 줄바꿈
      }

      // 마이그레이션 이슈 요약
      if (migrationIssues.length > 0) {
        log("\n마이그레이션 시 고려해야 할 이슈:");
        for (const issue of migrationIssues) {
          log(`- ${issue}`);
        }
      } else {
        log("\n마이그레이션 이슈가 없습니다. 안전하게 진행 가능합니다.");
      }

      // 상세 결과를 JSON 파일로 저장
      const resultFile = path.join(logDir, `schema-comparison-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(resultFile, JSON.stringify(comparisonResults, null, 2));
      log(`\n상세 비교 결과가 ${resultFile}에 저장되었습니다.`);
    } else {
      log("\nOLD 데이터베이스 연결 없이 계속합니다.");
      log("NEW 데이터베이스의 엔티티 목록:");
      
      for (const entity of newDataSource.entityMetadatas) {
        log(`- ${entity.tableName}`);
      }
    }

    // 마이그레이션 전략 안내
    log("\n마이그레이션 권장 전략:");
    log("1. 스키마 차이가 없는 테이블은 직접 데이터 복사 가능");
    log("2. OLD DB에만 존재하는 컬럼은 NEW DB에서 무시됨");
    log("3. 타입이 다른 컬럼은 데이터 변환이 필요할 수 있음");
    log("4. NEW DB에만 존재하는 컬럼은 NULL 또는 기본값으로 설정됨");

  } catch (error) {
    log(`스키마 비교 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 연결 종료
    if (oldDbConnected && oldDataSource.isInitialized) await oldDataSource.destroy();
    if (newDbConnected && newDataSource.isInitialized) await newDataSource.destroy();
    logStream.end();
  }
}

// 스크립트 실행
main().catch(error => {
  console.error("스키마 비교 실패:", error);
  process.exit(1);
}); 