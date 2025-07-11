import pool from '../database/connection-postgres';
import { ApiResponse, User } from '../types';

export class UserService {
  /**
   * Google認証でログインしたユーザーを登録または更新する
   */
  static async upsertGoogleUser(profile: any): Promise<ApiResponse<User>> {
    try {
      const googleId = profile.id;
      const name = profile.displayName || profile.name?.givenName || 'Unknown User';
      const email = profile.emails?.[0]?.value || null;
      
      // まず、既存のユーザーを確認
      const existingUserSql = `
        SELECT * FROM users WHERE id = $1
      `;
      
      const existingResult = await pool.query(existingUserSql, [googleId]);
      
      if (existingResult.rows.length > 0) {
        // 既存ユーザーの場合は更新
        const updateSql = `
          UPDATE users 
          SET name = $1, updated_at = $2
          WHERE id = $3
          RETURNING *
        `;
        
        const updateResult = await pool.query(updateSql, [name, new Date(), googleId]);
        const row = updateResult.rows[0];
        
        const user: User = {
          id: row.id,
          name: row.name,
          role: row.role,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
        
        return {
          success: true,
          data: user,
          message: 'User updated successfully'
        };
      } else {
        // 新規ユーザーの場合は作成
        // デフォルトで'husband'ロールを設定（後で変更可能）
        const insertSql = `
          INSERT INTO users (id, name, role, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const insertResult = await pool.query(insertSql, [
          googleId,
          name,
          'husband', // デフォルトロール
          new Date(),
          new Date()
        ]);
        
        const row = insertResult.rows[0];
        
        const user: User = {
          id: row.id,
          name: row.name,
          role: row.role,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
        
        return {
          success: true,
          data: user,
          message: 'User created successfully'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * ユーザーIDでユーザーを取得する
   */
  static async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const sql = `
        SELECT * FROM users WHERE id = $1
      `;
      
      const result = await pool.query(sql, [id]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      const row = result.rows[0];
      const user: User = {
        id: row.id,
        name: row.name,
        role: row.role,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 全てのユーザーを取得する
   */
  static async getAllUsers(): Promise<ApiResponse<User[]>> {
    try {
      const sql = `
        SELECT * FROM users ORDER BY created_at ASC
      `;
      
      const result = await pool.query(sql);
      
      const users: User[] = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
      
      return {
        success: true,
        data: users
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
