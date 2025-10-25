import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// CommonJS globals
declare const __dirname: string;

interface InviteCode {
  code: string;
  createdAt: string;
  createdBy: string;
  usedAt?: string;
  usedBy?: string;
  expiresAt?: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  notes?: string;
}

export class InviteCodeService {
  private codes: Map<string, InviteCode> = new Map();
  private readonly codesFilePath = join(__dirname, '../../data/invite-codes.json');

  constructor() {
    this.loadCodes();
  }

  /**
   * Load invite codes from file
   */
  private loadCodes() {
    try {
      if (existsSync(this.codesFilePath)) {
        const data = readFileSync(this.codesFilePath, 'utf-8');
        const codesArray = JSON.parse(data);
        this.codes = new Map(codesArray.map((c: InviteCode) => [c.code, c]));
        console.log(`✅ Loaded ${this.codes.size} invite codes from storage`);
      } else {
        console.log('📝 No existing invite codes file, starting fresh');
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
    }
  }

  /**
   * Save invite codes to file
   */
  private saveCodes() {
    try {
      const codesArray = Array.from(this.codes.values());
      const dir = join(__dirname, '../../data');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.codesFilePath, JSON.stringify(codesArray, null, 2));
    } catch (error) {
      console.error('Error saving invite codes:', error);
    }
  }

  /**
   * Generate a new invite code
   */
  generateCode(createdBy: string = 'admin', maxUses: number = 1, expiresInDays?: number, notes?: string): InviteCode {
    // Generate random code: BETA-XXXXXX
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `BETA-${randomPart}`;

    const inviteCode: InviteCode = {
      code,
      createdAt: new Date().toISOString(),
      createdBy,
      maxUses,
      currentUses: 0,
      isActive: true,
      notes
    };

    // Set expiration if specified
    if (expiresInDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      inviteCode.expiresAt = expiresAt.toISOString();
    }

    this.codes.set(code, inviteCode);
    this.saveCodes();

    console.log(`✅ Generated new invite code: ${code} (max uses: ${maxUses}, expires: ${expiresInDays ? `${expiresInDays} days` : 'never'})`);

    return inviteCode;
  }

  /**
   * Validate and use an invite code
   */
  useCode(code: string, usedBy: string): { valid: boolean; message: string } {
    const inviteCode = this.codes.get(code);

    if (!inviteCode) {
      console.log(`❌ Invalid invite code attempted: ${code}`);
      return { valid: false, message: 'Invalid invite code' };
    }

    if (!inviteCode.isActive) {
      console.log(`⛔ Disabled invite code attempted: ${code}`);
      return { valid: false, message: 'This invite code has been disabled' };
    }

    if (inviteCode.currentUses >= inviteCode.maxUses) {
      console.log(`⛔ Exhausted invite code attempted: ${code} (${inviteCode.currentUses}/${inviteCode.maxUses} uses)`);
      return { valid: false, message: 'This invite code has already been used' };
    }

    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      console.log(`⛔ Expired invite code attempted: ${code}`);
      return { valid: false, message: 'This invite code has expired' };
    }

    // Mark as used
    inviteCode.currentUses++;
    if (inviteCode.currentUses === 1) {
      inviteCode.usedAt = new Date().toISOString();
      inviteCode.usedBy = usedBy;
    }

    this.codes.set(code, inviteCode);
    this.saveCodes();

    console.log(`✅ Invite code used: ${code} by ${usedBy} (${inviteCode.currentUses}/${inviteCode.maxUses} uses)`);

    return { valid: true, message: 'Invite code accepted' };
  }

  /**
   * Disable an invite code
   */
  disableCode(code: string): boolean {
    const inviteCode = this.codes.get(code);
    if (!inviteCode) {
      return false;
    }

    inviteCode.isActive = false;
    this.codes.set(code, inviteCode);
    this.saveCodes();

    console.log(`⛔ Disabled invite code: ${code}`);
    return true;
  }

  /**
   * Get all invite codes
   */
  getAllCodes(): InviteCode[] {
    return Array.from(this.codes.values());
  }

  /**
   * Get active codes
   */
  getActiveCodes(): InviteCode[] {
    return Array.from(this.codes.values()).filter(c => c.isActive && c.currentUses < c.maxUses);
  }

  /**
   * Get code statistics
   */
  getStats(): { total: number; active: number; used: number; expired: number } {
    const all = Array.from(this.codes.values());
    const now = new Date();

    return {
      total: all.length,
      active: all.filter(c => c.isActive && c.currentUses < c.maxUses && (!c.expiresAt || new Date(c.expiresAt) > now)).length,
      used: all.filter(c => c.currentUses >= c.maxUses).length,
      expired: all.filter(c => c.expiresAt && new Date(c.expiresAt) < now).length
    };
  }
}

export const inviteCodeService = new InviteCodeService();
