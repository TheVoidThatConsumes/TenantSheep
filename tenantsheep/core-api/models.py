from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from database import Base


class Org(Base):
    __tablename__ = "orgs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Operator(Base):
    __tablename__ = "operators"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    role = Column(String, default="operator")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    status = Column(String, default="draft")
    # in_progress -> in_review -> ready_to_distribute. Once a project reaches
    # ready_to_distribute, a Distribute campaign is expected to reference it
    # via Campaign.sourceProjectId -- the Create -> Distribute pipeline this
    # product suite is actually for.
    stage = Column(String, default="in_progress")
    created_at = Column(DateTime, server_default=func.now())
