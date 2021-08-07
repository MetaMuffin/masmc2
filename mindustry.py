
class Block:
    pass

class Thing:
    pass

I_COPPER = Thing()
I_LEAD = Thing()
I_GRAPHITE = Thing()
I_TITANIUM = Thing()
I_METAGLAS = Thing()
I_THORIUM = Thing()
I_SILICON = Thing()
I_PLASTANIUM = Thing()
I_PHASEFABRIC = Thing()
I_SURGEALLOY = Thing()

U_CRAWLER = Thing()
U_DAGGER = Thing()

def sensor(thing: Thing, target: Block): pass
def control_enabled(block: Block, value: bool): pass
def print(message): pass
def print_flush(block: Block): pass


