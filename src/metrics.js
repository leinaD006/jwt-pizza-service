const os = require('os');
const fetch = require('node-fetch');
const config = require('./config.js');

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(prefix, name, value, tags = {}) {
    // Convert tags object to string format
    const tagStr = Object.entries({ source: config.metrics.source, ...tags })
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    // Build the metric line in InfluxDB line protocol format
    this.metrics.push(`${prefix},${tagStr} ${name}=${value}`);
  }

  toString() {
    return this.metrics.join('\n');
  }
}

class Metrics {
  constructor() {
    this.httpRequests = new Map(); // Track request counts by method
    this.activeUsers = new Set(); // Track unique active users
    this.authAttempts = { success: 0, failure: 0 }; // Track auth attempts
    this.pizzaMetrics = { sold: 0, failures: 0, revenue: 0 }; // Track pizza metrics
    this.latencyData = [];
    this.pizzaLatency = [];

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  // Middleware to track HTTP requests
  requestTracker = (req, res, next) => {
    const startTime = Date.now();

    // Increment request count for this method
    const current = this.httpRequests.get(req.method) || 0;
    this.httpRequests.set(req.method, current + 1);

    // Track user if authenticated
    if (req.user) {
      this.activeUsers.add(req.user.id);
    }

    // Track latency after response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.latencyData.push(duration);
    });

    next();
  };

  // Track authentication attempts
  trackAuth(success) {
    if (success) {
      this.authAttempts.success++;
    } else {
      this.authAttempts.failure++;
    }
  }

  // Track pizza orders
  trackPizzaOrder(order, success, latency) {
    if (success) {
      this.pizzaMetrics.sold += order.items.length;
      this.pizzaMetrics.revenue += order.items.reduce((sum, item) => sum + item.price, 0);
    } else {
      this.pizzaMetrics.failures++;
    }
    this.pizzaLatency.push(latency);
  }

  // System metrics collection
  collectSystemMetrics() {
    const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      cpu: cpuUsage.toFixed(2),
      memory: memoryUsage.toFixed(2),
    };
  }

  // Send metrics to Grafana
  async sendMetrics(metrics) {
    try {
      const response = await fetch(config.metrics.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}`,
          'Content-Type': 'text/plain',
        },
        body: metrics,
      });

      if (!response.ok) {
        console.error('Failed to send metrics:', await response.text());
      }
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }

  // Periodic reporting of all metrics
  async reportMetrics() {
    const builder = new MetricBuilder();
    // const now = Date.now();

    // HTTP requests
    let total = 0;
    for (const [method, count] of this.httpRequests) {
      total += count;
      builder.addMetric('request', 'total', count, { method });
    }
    // Total requests
    builder.addMetric('request', 'total', total, { method: 'all' });

    // this.httpRequests.clear();

    // Active users
    builder.addMetric('users', 'active', this.activeUsers.size);
    this.activeUsers.clear();

    // Authentication
    builder.addMetric('auth', 'attempts_success', this.authAttempts.success);
    builder.addMetric('auth', 'attempts_failure', this.authAttempts.failure);
    // this.authAttempts.success = 0;
    // this.authAttempts.failure = 0;

    // System metrics
    const systemMetrics = this.collectSystemMetrics();
    builder.addMetric('system', 'cpu_usage', systemMetrics.cpu);
    builder.addMetric('system', 'memory_usage', systemMetrics.memory);

    // Pizza metrics
    builder.addMetric('pizza', 'sold', this.pizzaMetrics.sold);
    builder.addMetric('pizza', 'failures', this.pizzaMetrics.failures);
    builder.addMetric('pizza', 'revenue', this.pizzaMetrics.revenue);
    this.pizzaMetrics.sold = 0;
    this.pizzaMetrics.failures = 0;
    this.pizzaMetrics.revenue = 0;

    // Latency metrics
    const latencies = this.latencyData;
    if (latencies.length > 0) {
      const sum = latencies.reduce((sum, val) => sum + val, 0);
      const avg = sum / latencies.length;
      builder.addMetric('latency', 'average', avg);
    }
    this.latencyData = [];

    const pizzaLatencies = this.pizzaLatency;
    if (pizzaLatencies.length > 0) {
      const sum = pizzaLatencies.reduce((sum, val) => sum + val, 0);
      const avg = sum / pizzaLatencies.length;
      builder.addMetric('latency', 'pizza', avg);
    }
    this.pizzaLatency = [];

    // Send metrics to Grafana
    await this.sendMetrics(builder.toString());
  }

  startPeriodicReporting() {
    // Report metrics every minute
    setInterval(() => this.reportMetrics(), 10000);
  }
}

module.exports = new Metrics();
