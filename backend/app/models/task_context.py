import enum


class TaskContext(str, enum.Enum):
    WORK = "work"
    LEARNING = "learning"
    LIFE = "life"
