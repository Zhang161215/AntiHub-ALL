'use client';

import { useEffect, useState } from "react"
import { 
  IconUsers, 
  IconCpu, 
  IconChartBar, 
  IconActivity,
  IconWallet,
  IconTrendingUp,
  IconClock,
  IconRefresh,
  IconArrowRight
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getQuotaConsumption,
  getKiroAccounts,
  getKiroConsumptionStats,
  getKiroAccountConsumption,
  getKiroAccountBalance,
  getRequestUsageStats,
  getAccounts,
  getQwenAccounts,
  getCodexAccounts,
} from "@/lib/api"

interface ComputedStats {
  totalAccounts: number;
  activeAccounts: number;
  consumedLast24h: number;
  callsLast24h: number;
  totalRequests: number;
  totalQuotaConsumed: number;
}

interface KiroBalanceSummary {
  totalLimit: number;
  totalUsed: number;
  totalAvailable: number;
  accountCount: number;
  activeCount: number;
}

interface RecentActivity {
  id: string;
  type: 'kiro' | 'antigravity' | 'qwen' | 'codex';
  model: string;
  amount: number;
  time: Date;
  accountName?: string;
}

export function SectionCards() {
  const [stats, setStats] = useState<ComputedStats | null>(null);
  const [kiroBalance, setKiroBalance] = useState<KiroBalanceSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [antigravityAccounts, antigravityConsumption, qwenAccounts, qwenStats24h, qwenStatsAll, codexAccounts, codexStats24h, codexStatsAll] = await Promise.all([
        getAccounts(),
        getQuotaConsumption({ limit: 1000 }),
        getQwenAccounts().catch(() => []),
        getRequestUsageStats({ start_date: last24h.toISOString(), config_type: 'qwen' }).catch(() => null),
        getRequestUsageStats({ config_type: 'qwen' }).catch(() => null),
        getCodexAccounts().catch(() => []),
        getRequestUsageStats({ start_date: last24h.toISOString(), config_type: 'codex' }).catch(() => null),
        getRequestUsageStats({ config_type: 'codex' }).catch(() => null),
      ]);

      // 计算24小时内的消耗
      const recentConsumption = antigravityConsumption.filter(c => new Date(c.consumed_at) >= last24h);
      const antigravityConsumedLast24h = recentConsumption.reduce((sum, c) => sum + (Number.parseFloat(c.quota_consumed) || 0), 0);
      const antigravityCallsLast24h = recentConsumption.length;
      const antigravityTotalQuotaConsumed = antigravityConsumption.reduce((sum, c) => sum + (Number.parseFloat(c.quota_consumed) || 0), 0);
      const antigravityTotalRequests = antigravityConsumption.length;

      const qwenCallsLast24h = qwenStats24h?.total_requests || 0;
      const qwenTotalRequests = qwenStatsAll?.total_requests || 0;

      const codexCallsLast24h = codexStats24h?.total_requests || 0;
      const codexTotalRequests = codexStatsAll?.total_requests || 0;

      // 获取 Kiro 数据
      let kiroAccounts: any[] = [];
      let totalKiroRequests = 0;
      let totalKiroQuotaConsumed = 0;
      let kiroConsumedLast24h = 0;
      let kiroCallsLast24h = 0;

      try {
        // 获取 Kiro 账号
        kiroAccounts = await getKiroAccounts();

        // 获取 Kiro 消费统计
        const kiroStats = await getKiroConsumptionStats();
        totalKiroRequests = Number.parseInt(kiroStats.total_requests, 10) || 0;
        totalKiroQuotaConsumed = Number.parseFloat(kiroStats.total_credit) || 0;

        // 计算 Kiro 24小时数据（按账号聚合）
        if (kiroAccounts.length > 0) {
          const responses = await Promise.all(
            kiroAccounts.map((account) =>
              getKiroAccountConsumption(account.account_id, {
                limit: 1000,
                start_date: last24h.toISOString(),
                end_date: now.toISOString(),
              }).catch(() => null)
            )
          );
          const logs = responses.flatMap((resp) => resp?.logs ?? []);
          kiroConsumedLast24h = logs.reduce((sum, log) => sum + (log.credit_used || 0), 0);
          kiroCallsLast24h = logs.length;

          // 收集最近活动（取最新5条）
          const kiroActivities: RecentActivity[] = logs
            .sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime())
            .slice(0, 5)
            .map(log => ({
              id: log.log_id,
              type: 'kiro' as const,
              model: log.model_id,
              amount: Number(log.credit_used) || 0,
              time: new Date(log.consumed_at),
              accountName: log.account_name,
            }));
          setRecentActivities(kiroActivities);

          // 获取 Kiro 余额汇总
          const balanceResponses = await Promise.all(
            kiroAccounts.map((account) =>
              getKiroAccountBalance(account.account_id).catch(() => null)
            )
          );
          
          const balanceSummary = balanceResponses.reduce(
            (acc, resp) => {
              if (resp?.balance) {
                acc.totalLimit += resp.balance.total_limit || 0;
                acc.totalUsed += resp.balance.current_usage || 0;
                acc.totalAvailable += (resp.balance.total_limit - resp.balance.current_usage) || 0;
              }
              return acc;
            },
            { totalLimit: 0, totalUsed: 0, totalAvailable: 0 }
          );

          setKiroBalance({
            ...balanceSummary,
            accountCount: kiroAccounts.length,
            activeCount: kiroAccounts.filter((a) => a.status === 1).length,
          });
        }
      } catch (err) {
        console.warn('加载 Kiro 数据失败，仅显示 Antigravity 数据', err);
      }

      const totalAccounts = antigravityAccounts.length + kiroAccounts.length + qwenAccounts.length + codexAccounts.length;
      const activeAccounts =
        antigravityAccounts.filter((a) => a.status === 1).length +
        kiroAccounts.filter((a) => a.status === 1).length +
        qwenAccounts.filter((a) => a.status === 1).length +
        codexAccounts.filter((a: any) => (a.effective_status ?? a.status) === 1).length;

      setStats({
        totalAccounts,
        activeAccounts,
        consumedLast24h: antigravityConsumedLast24h + kiroConsumedLast24h,
        callsLast24h: antigravityCallsLast24h + kiroCallsLast24h + qwenCallsLast24h + codexCallsLast24h,
        totalRequests: antigravityTotalRequests + totalKiroRequests + qwenTotalRequests + codexTotalRequests,
        totalQuotaConsumed: antigravityTotalQuotaConsumed + totalKiroQuotaConsumed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        {/* Kiro 余额卡片骨架 */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-3 w-12 mx-auto mb-1" />
                  <Skeleton className="h-6 w-16 mx-auto" />
                </div>
              ))}
            </div>
            <Skeleton className="h-2 w-full mt-3" />
          </CardContent>
        </Card>
        
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-7 w-16" />
              </CardHeader>
              <CardFooter className="pt-0">
                <Skeleton className="h-3 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 space-y-4">
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">账户总数</CardDescription>
              <div className="p-1 rounded bg-primary/10">
                <IconUsers className="size-3.5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {stats?.totalAccounts || 0}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0">
            <p className="text-[10px] text-muted-foreground">
              {stats?.activeAccounts || 0} 个活跃
            </p>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">活跃账号</CardDescription>
              <div className="p-1 rounded bg-green-500/10">
                <IconCpu className="size-3.5 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums text-green-600">
              {stats?.activeAccounts || 0}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0">
            <p className="text-[10px] text-muted-foreground">
              全渠道启用中
            </p>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">24h 消耗</CardDescription>
              <div className="p-1 rounded bg-orange-500/10">
                <IconChartBar className="size-3.5 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {(parseFloat(String(stats?.consumedLast24h)) || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0">
            <p className="text-[10px] text-muted-foreground">
              总计 {(parseFloat(String(stats?.totalQuotaConsumed)) || 0).toFixed(2)}
            </p>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">24h 调用</CardDescription>
              <div className="p-1 rounded bg-blue-500/10">
                <IconActivity className="size-3.5 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {(stats?.callsLast24h || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0">
            <p className="text-[10px] text-muted-foreground">
              总计 {(stats?.totalRequests || 0).toLocaleString()} 次
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* 最近活动 */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10">
                  <IconClock className="size-4 text-purple-500" />
                </div>
                <CardTitle className="text-base font-medium">最近活动</CardTitle>
              </div>
              <a href="/dashboard/analytics" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                查看全部 <IconArrowRight className="size-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                      {activity.type === 'kiro' ? 'Kiro' : activity.type}
                    </Badge>
                    <span className="text-xs font-mono truncate max-w-[120px]">{activity.model}</span>
                    {activity.accountName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {activity.accountName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-orange-500">-${(Number(activity.amount) || 0).toFixed(4)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(activity.time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 时间格式化辅助函数
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
