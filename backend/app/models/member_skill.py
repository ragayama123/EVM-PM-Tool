from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class MemberSkill(Base):
    """メンバースキル（担当可能タスク種別）"""

    __tablename__ = "member_skills"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(String, nullable=False)

    # ユニーク制約（同じメンバーに同じスキルは1つだけ）
    __table_args__ = (
        UniqueConstraint('member_id', 'task_type', name='uix_member_skill'),
    )

    # リレーション
    member = relationship("Member", back_populates="skills")
