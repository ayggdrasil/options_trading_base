import sys
import json
import numpy as np
import signal

# Import the existing functions from svi.py
from svi import calculate_asymptotes, initialize_svi_params, svi, optimize_svi

MAX_SVI = 2.0

# Signal handler for graceful shutdown
def handle_exit_signal(signum, frame):
  print(json.dumps({"type": "shutdown", "message": "Server shutting down"}))
  sys.stdout.flush()
  sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, handle_exit_signal)
signal.signal(signal.SIGINT, handle_exit_signal)

def process_request(request):
  """Process a single request and return the response"""
  if request["type"] != "request":
    return {"type": "error", "error": "Invalid request type"}
      
  data = request["data"]
  try:
    # Reuse the generate_ivs function from the original script
    svi_data = data['sviDataByExpiry']
    missing_instruments = data['missingInstruments']
    apply_max_svi = data['applyMaxSvi']
    
    # Calculate asymptotes and initial parameters
    # asymptotes = calculate_asymptotes(
    #   svi_data['strikePrices']['logarithmic'],
    #   svi_data['ivs']['squared']
    # )
    
    # initial_params = initialize_svi_params(asymptotes, svi_data['ivs']['squared'])
    
    # Optimize SVI parameters
    optimized_params = optimize_svi(
      # initial_params,
      svi_data['strikePrices']['logarithmic'],
      svi_data['ivs']['squared']
    )
    
    # Calculate IVs for missing instruments
    result = {}

    for instrument in missing_instruments:
      _, _, strike_price, _ = instrument.split('-')
      strike_price = float(strike_price)
      log_strike_price = np.log(strike_price / svi_data['underlyingFutures'])
      
      iv = np.sqrt(svi(optimized_params, log_strike_price))
      
      if not np.isnan(iv):
        if apply_max_svi:
          result[instrument] = min(iv, MAX_SVI)
        else:
          result[instrument] = iv
    
    return {"type": "result", "requestId": request["id"], "data": result}
  except Exception as e:
    return {"type": "error", "requestId": request["id"], "error": str(e)}

# Send ready message
print(json.dumps({"type": "ready"}))
sys.stdout.flush()

# Main loop - Listen for commands
while True:
  try:
    line = sys.stdin.readline()
    if not line:
      # End of input stream, exit gracefully
      break
        
    request = json.loads(line)
    response = process_request(request)
    
    print(json.dumps(response))
    sys.stdout.flush()
            
  except Exception as e:
      print(json.dumps({"type": "error", "error": str(e)}))
      sys.stdout.flush()