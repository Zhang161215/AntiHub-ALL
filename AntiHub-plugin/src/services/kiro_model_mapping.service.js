import database from '../db/database.js';
import logger from '../utils/logger.js';

// 默认模型映射（使用服务器验证稳定的 dotted Kiro model id）
const DEFAULT_MODEL_MAPPINGS = {
  'claude-sonnet-4-5': 'claude-sonnet-4.5',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4.5',
  'claude-sonnet-4-5-20250929-thinking': 'claude-sonnet-4.5',
  'claude-sonnet-4-5-thinking': 'claude-sonnet-4.5',
  'claude-sonnet-4-20250514': 'claude-sonnet-4',
  'claude-opus-4-5-20251101': 'claude-opus-4.5',
  'claude-opus-4-5-20251101-thinking': 'claude-opus-4.5',
  'claude-opus-4-6': 'claude-opus-4.6',
  'claude-opus-4-6-20260205': 'claude-opus-4.6',
  'claude-opus-4-6-20260205-thinking': 'claude-opus-4.6',
  'claude-opus-4-6-thinking': 'claude-opus-4.6',
  'claude-haiku-4-5-20251001': 'claude-haiku-4.5',
  'claude-haiku-4-5-20251001-thinking': 'claude-haiku-4.5'
};

// 缓存 TTL
const CACHE_TTL_MS = 60 * 1000;

class KiroModelMappingService {
  constructor() {
    this._tableEnsured = false;
    this._cache = null; // { loadedAt: number, mappings: object }
  }

  _invalidateCache() {
    this._cache = null;
  }

  async _ensureTable() {
    if (this._tableEnsured) return;

    try {
      await database.query(`
        CREATE TABLE IF NOT EXISTS public.kiro_model_mappings (
          id SERIAL PRIMARY KEY,
          frontend_model text UNIQUE NOT NULL,
          kiro_model text NOT NULL,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this._tableEnsured = true;
      
      // 检查是否需要初始化默认数据
      const countResult = await database.query('SELECT COUNT(*) as count FROM kiro_model_mappings');
      if (parseInt(countResult.rows[0].count) === 0) {
        logger.info('初始化默认模型映射...');
        for (const [frontend, kiro] of Object.entries(DEFAULT_MODEL_MAPPINGS)) {
          await database.query(
            'INSERT INTO kiro_model_mappings (frontend_model, kiro_model) VALUES ($1, $2) ON CONFLICT (frontend_model) DO NOTHING',
            [frontend, kiro]
          );
        }
      }
    } catch (error) {
      logger.error('确保 kiro_model_mappings 表存在失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取所有模型映射
   * @returns {Promise<object>} { frontend_model: kiro_model, ... }
   */
  async getMappings() {
    const now = Date.now();
    if (this._cache && now - this._cache.loadedAt < CACHE_TTL_MS) {
      return this._cache.mappings;
    }

    await this._ensureTable();

    const result = await database.query(
      'SELECT frontend_model, kiro_model FROM kiro_model_mappings ORDER BY frontend_model'
    );

    const mappings = {};
    for (const row of result.rows) {
      mappings[row.frontend_model] = row.kiro_model;
    }

    this._cache = { loadedAt: now, mappings };
    return mappings;
  }

  /**
   * 添加或更新单个映射
   * @param {string} frontendModel - 前端模型名
   * @param {string} kiroModel - Kiro 真实模型名
   */
  async upsertMapping(frontendModel, kiroModel) {
    await this._ensureTable();

    await database.query(
      `INSERT INTO kiro_model_mappings (frontend_model, kiro_model, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (frontend_model) DO UPDATE SET
         kiro_model = EXCLUDED.kiro_model,
         updated_at = CURRENT_TIMESTAMP`,
      [frontendModel, kiroModel]
    );

    this._invalidateCache();
    logger.info(`模型映射已更新: ${frontendModel} -> ${kiroModel}`);
  }

  /**
   * 批量更新映射（替换所有）
   * @param {object} mappings - { frontend_model: kiro_model, ... }
   */
  async setMappings(mappings) {
    await this._ensureTable();

    // 开始事务
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      
      // 清空现有映射
      await client.query('DELETE FROM kiro_model_mappings');
      
      // 插入新映射
      for (const [frontend, kiro] of Object.entries(mappings)) {
        await client.query(
          'INSERT INTO kiro_model_mappings (frontend_model, kiro_model) VALUES ($1, $2)',
          [frontend, kiro]
        );
      }
      
      await client.query('COMMIT');
      this._invalidateCache();
      logger.info(`模型映射已批量更新，共 ${Object.keys(mappings).length} 个`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除单个映射
   * @param {string} frontendModel - 前端模型名
   */
  async deleteMapping(frontendModel) {
    await this._ensureTable();

    const result = await database.query(
      'DELETE FROM kiro_model_mappings WHERE frontend_model = $1',
      [frontendModel]
    );

    this._invalidateCache();
    
    if (result.rowCount > 0) {
      logger.info(`模型映射已删除: ${frontendModel}`);
      return true;
    }
    return false;
  }

  /**
   * 根据前端模型名获取 Kiro 模型名
   * @param {string} frontendModel - 前端模型名
   * @returns {Promise<string|null>} Kiro 模型名，未找到返回 null
   */
  async getKiroModel(frontendModel) {
    const mappings = await this.getMappings();
    return mappings[frontendModel] || null;
  }

  /**
   * 重置为默认映射
   */
  async resetToDefault() {
    await this.setMappings(DEFAULT_MODEL_MAPPINGS);
    logger.info('模型映射已重置为默认值');
  }
}

const kiroModelMappingService = new KiroModelMappingService();
export default kiroModelMappingService;
export { DEFAULT_MODEL_MAPPINGS };
