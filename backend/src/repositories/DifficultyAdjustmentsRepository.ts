import { Common } from '../api/common';
import DB from '../database';
import logger from '../logger';
import { IndexedDifficultyAdjustment } from '../mempool.interfaces';

class DifficultyAdjustmentsRepository {
  public async $saveAdjustments(adjustment: IndexedDifficultyAdjustment): Promise<void> {
    if (adjustment.height === 1) {
      return;
    }

    try {
      const query = `INSERT INTO difficulty_adjustments(time, height, difficulty, adjustment) VALUE (FROM_UNIXTIME(?), ?, ?, ?)`;
      const params: any[] = [
        adjustment.time,
        adjustment.height,
        adjustment.difficulty,
        adjustment.adjustment,
      ];
      await DB.query(query, params);
    } catch (e: any) {
      if (e.errno === 1062) { // ER_DUP_ENTRY - This scenario is possible upon node backend restart
        logger.debug(`Cannot save difficulty adjustment at block ${adjustment.height}, already indexed, ignoring`);
      } else {
        logger.err(`Cannot save difficulty adjustment at block ${adjustment.height}. Reason: ${e instanceof Error ? e.message : e}`);
        throw e;
      }
    }
  }

  public async $getAdjustments(interval: string | null, descOrder: boolean = false): Promise<IndexedDifficultyAdjustment[]> {
    let daysResolution: number = 1;
    switch (interval) {
      case 'all': daysResolution = 7; break;
      case '3y': daysResolution = 3; break;
      case '2y': daysResolution = 2; break;
      default: break;
    }

    interval = Common.getSqlInterval(interval);

    let query = `SELECT 
      CAST(AVG(UNIX_TIMESTAMP(time)) as INT) as time,
      CAST(AVG(height) AS INT) as height,
      CAST(AVG(difficulty) as DOUBLE) as difficulty,
      CAST(AVG(adjustment) as DOUBLE) as adjustment
      FROM difficulty_adjustments`;

    if (interval) {
      query += ` WHERE time BETWEEN DATE_SUB(NOW(), INTERVAL ${interval}) AND NOW()`;
    }

    query += ` GROUP BY UNIX_TIMESTAMP(time) DIV ${daysResolution * 86400}`;

    if (descOrder === true) {
      query += ` ORDER BY time DESC`;
    } else {
      query += ` ORDER BY time`;
    }

    try {
      const [rows] = await DB.query(query);
      return rows as IndexedDifficultyAdjustment[];
    } catch (e) {
      logger.err(`Cannot get difficulty adjustments from the database. Reason: ` + (e instanceof Error ? e.message : e));
      throw e;
    }
  }

  public async $getAdjustmentsHeights(): Promise<number[]> {
    try {
      const [rows]: any[] = await DB.query(`SELECT height FROM difficulty_adjustments`);
      return rows.map(block => block.height);
    } catch (e: any) {
      logger.err(`Cannot get difficulty adjustment block heights. Reason: ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }

  public async $deleteAdjustementsFromHeight(height: number): Promise<void> {
    try {
      logger.info(`Delete newer difficulty adjustments from height ${height} from the database`);
      await DB.query(`DELETE FROM difficulty_adjustments WHERE height >= ?`, [height]);
    } catch (e: any) {
      logger.err(`Cannot delete difficulty adjustments from the database. Reason: ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }

  public async $deleteLastAdjustment(): Promise<void> {
    try {
      logger.info(`Delete last difficulty adjustment from the database`);
      await DB.query(`DELETE FROM difficulty_adjustments ORDER BY time LIMIT 1`);
    } catch (e: any) {
      logger.err(`Cannot delete last difficulty adjustment from the database. Reason: ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }
}

export default new DifficultyAdjustmentsRepository();

