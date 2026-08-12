export class GraphQLMiddleware {
  private rateLimits = new Map<string, number>();
  
  constructor(private rules: Record<string, boolean>) {}
  
  async validate(field: string, userId: string): Promise<boolean> {
    if (!this.rules[field]) return false;
    
    const key = `${userId}:${field}`;
    const count = (this.rateLimits.get(key) || 0) + 1;
    if (count > 100) return false;
    
    this.rateLimits.set(key, count);
    return true;
  }
}
