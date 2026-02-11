import numpy as np
from scipy.optimize import minimize

# 초기 파라미터 계산 함수
def calculate_asymptotes(log_strike_prices, squared_ivs):
  x1, x2 = log_strike_prices[0], log_strike_prices[1]
  y1, y2 = squared_ivs[0], squared_ivs[1]
  
  L_alpha = -(y2 - y1) / (x2 - x1)
  L_beta = (x1 * y2 - x2 * y1) / (x1 - x2)

  x1_right, x2_right = log_strike_prices[-2], log_strike_prices[-1]
  y1_right, y2_right = squared_ivs[-2], squared_ivs[-1]

  R_alpha = (y2_right - y1_right) / (x2_right - x1_right)
  R_beta = (x2_right * y1_right - x1_right * y2_right) / (x2_right - x1_right)

  return L_alpha, L_beta, R_alpha, R_beta

# 좌측 및 우측 점근선의 기울기와 절편을 계산하고, 이를 바탕으로 초기 SVI 파라미터를 설정하는 함수
def initialize_svi_params(asymptotes, squared_ivs):
  L_alpha, L_beta, R_alpha, R_beta = asymptotes
  a = L_beta + (R_beta - L_beta) / (L_alpha - R_alpha)
  b = (R_alpha - L_alpha) / 2
  rho = (R_alpha + L_alpha) / (R_alpha - L_alpha)
  m = (L_beta / b) * (L_alpha - R_alpha) * (rho - 1)
  sigma = np.sqrt(min(squared_ivs)) # 가장 작은 IV^2 값을 사용하여 sigma 계산
  
  return {'a': a, 'b': b, 'rho': rho, 'm': m, 'sigma': sigma}

# SVI 함수 (5개 파라미터를 기반으로 추정 IV값을 구하는 SVI 방정식)
def svi(params, log_strike_price):
  a, b, rho, m, sigma = params['a'], params['b'], params['rho'], params['m'], params['sigma']
  inner = (log_strike_price - m) ** 2 + sigma ** 2
  return a + b * (rho * (log_strike_price - m) + np.sqrt(inner))

# MSE 계산하는 함수 (SVI를 통해 계산한 IV의 제곱과 실제 IV의 제곱간의 차이의 평균)
def mean_squared_error(params, log_strike_prices, squared_ivs):
  errors = [(squared_ivs[i] - svi(params, k)) ** 2 for i, k in enumerate(log_strike_prices)]
  return np.mean(errors)

# MSE를 최소화하는 파라미터 iteration을 통해 추정하는 함수 >> 해당 Iteration을 더 최적화할 방법 필요 
def optimize_svi(log_strike_prices, squared_ivs):
  def cost_fn(params_array):
    params = {
        'a': params_array[0],
        'b': params_array[1],
        'rho': params_array[2],
        'm': params_array[3],
        'sigma': params_array[4]
    }
    return mean_squared_error(params, log_strike_prices, squared_ivs)

  initial_values = [0, 1, 0, 0, 0.1]
  
  bounds = [
    (-20, 20),   # a value (수직 이동)
    (0, 20),     # b value (곡률)
    (-1, 1),     # rho value (비대칭성)
    (-0.5, 0.5), # m value (로그-머니나스의 변동성 최소값)
    (0, 5)       # sigma value (곡선의 폭)
  ]

  result = minimize(cost_fn, initial_values, bounds=bounds, method='L-BFGS-B')
  
  return {
    'a': result.x[0],
    'b': result.x[1],
    'rho': result.x[2],
    'm': result.x[3],
    'sigma': result.x[4]
  }