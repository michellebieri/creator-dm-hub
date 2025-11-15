import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'create-payment': { maxRequests: 10, windowMinutes: 1 },
  'verify-payment': { maxRequests: 20, windowMinutes: 1 },
  'create-bundle-payment': { maxRequests: 10, windowMinutes: 1 },
  'verify-bundle-payment': { maxRequests: 20, windowMinutes: 1 },
  'send-email': { maxRequests: 5, windowMinutes: 1 },
  'create-notification': { maxRequests: 30, windowMinutes: 1 },
  'send-push-notification': { maxRequests: 20, windowMinutes: 1 },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  endpoint: string,
  userId?: string,
  ipAddress?: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = DEFAULT_LIMITS[endpoint] || { maxRequests: 60, windowMinutes: 1 };
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  try {
    // Check by user ID if authenticated
    if (userId) {
      const { data: existing } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .order('window_start', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        if (existing.request_count >= config.maxRequests) {
          const resetAt = new Date(
            new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000
          );
          return {
            allowed: false,
            remaining: 0,
            resetAt,
          };
        }

        // Increment count
        await supabase
          .from('rate_limits')
          .update({ request_count: existing.request_count + 1 })
          .eq('user_id', userId)
          .eq('endpoint', endpoint)
          .eq('window_start', existing.window_start);

        return {
          allowed: true,
          remaining: config.maxRequests - existing.request_count - 1,
          resetAt: new Date(
            new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000
          ),
        };
      }

      // Create new rate limit record
      await supabase.from('rate_limits').insert({
        user_id: userId,
        endpoint,
        request_count: 1,
        window_start: now.toISOString(),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
      };
    }

    // Check by IP if not authenticated
    if (ipAddress) {
      const { data: existing } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('ip_address', ipAddress)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .order('window_start', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        if (existing.request_count >= config.maxRequests) {
          const resetAt = new Date(
            new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000
          );
          return {
            allowed: false,
            remaining: 0,
            resetAt,
          };
        }

        await supabase
          .from('rate_limits')
          .update({ request_count: existing.request_count + 1 })
          .eq('ip_address', ipAddress)
          .eq('endpoint', endpoint)
          .eq('window_start', existing.window_start);

        return {
          allowed: true,
          remaining: config.maxRequests - existing.request_count - 1,
          resetAt: new Date(
            new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000
          ),
        };
      }

      await supabase.from('rate_limits').insert({
        ip_address: ipAddress,
        endpoint,
        request_count: 1,
        window_start: now.toISOString(),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
      };
    }

    // No user ID or IP - allow but log warning
    console.warn('Rate limit check without user ID or IP');
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
    };
  }
}

export function getRateLimitHeaders(remaining: number, resetAt: Date) {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
  };
}
