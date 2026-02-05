
        // Financial data in correct chronological order (2018-19 to 2024-25)
        const periods = [
            '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'
        ];
        
        const income = [37854, 30034, 150291, 33275, 25103, 17623, 415];
        const expenses = [31138, 27396, 38402, 15038, 27133, 60128, 12098];
        const net = [6716, 2638, 111889, 18237, -2030, -42505, -11683];
        const expensePct = [82, 91, 26, 45, 108, 341, 2915];
        
        // Trend Chart (Income vs Expenses)
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: [
                    {
                        label: 'Income',
                        data: income,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Expenses',
                        data: expenses,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Income and Expenses Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.raw.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Net Surplus/Deficit Chart
        const netCtx = document.getElementById('netChart').getContext('2d');
        new Chart(netCtx, {
            type: 'bar',
            data: {
                labels: periods,
                datasets: [{
                    label: 'Net Surplus/(Deficit)',
                    data: net,
                    backgroundColor: net.map(value => value >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
                    borderColor: net.map(value => value >= 0 ? '#27ae60' : '#e74c3c'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Annual Net Position'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const sign = value >= 0 ? '+' : '';
                                return sign + '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Expense Percentage Chart
        const expensePctCtx = document.getElementById('expensePctChart').getContext('2d');
        new Chart(expensePctCtx, {
            type: 'bar',
            data: {
                labels: periods,
                datasets: [{
                    label: 'Expenses as % of Income',
                    data: expensePct,
                    backgroundColor: expensePct.map(value => value > 100 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(52, 152, 219, 0.7)'),
                    borderColor: expensePct.map(value => value > 100 ? '#e74c3c' : '#3498db'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Expense Efficiency Ratio'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.raw + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
