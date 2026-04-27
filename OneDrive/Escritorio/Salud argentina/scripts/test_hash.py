import bcrypt
pw = b"dev123"
stored = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMVJcSRfVEhUzW5jyTPGFRXC2u"
print("Match:", bcrypt.checkpw(pw, stored.encode("utf-8")))
new_hash = bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")
print("New hash for dev123:", new_hash)
