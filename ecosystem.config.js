module.exports = {
    apps: [
        {
            name: 'krypton',
            script: './src/krypton.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            max_restarts: 10,
            min_uptime: '10s',
            listen_timeout: 3000,
            kill_timeout: 5000
        }
    ]
}
