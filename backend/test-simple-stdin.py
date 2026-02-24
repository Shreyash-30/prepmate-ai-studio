import json
import sys

# Simple echo program
if __name__ == "__main__":
    try:
        # Read from stdin
        input_str = sys.stdin.read().strip()
        input_data = json.loads(input_str)
        
        # Echo back
        output = {
            "received": input_data,
            "type": str(type(input_data)).replace("<class '", "").replace("'>", "")
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
