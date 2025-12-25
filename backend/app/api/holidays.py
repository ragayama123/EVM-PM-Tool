from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import csv
import io

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.holiday import Holiday, HolidayType
from app.models.project import Project
from app.models.user import User
from app.schemas.holiday import (
    HolidayCreate, HolidayUpdate, HolidayResponse,
    HolidayImportRequest, HolidayGenerateRequest
)

router = APIRouter(prefix="/holidays", tags=["holidays"])

# 日本の祝日（固定日・2024-2025年）
JAPANESE_NATIONAL_HOLIDAYS = {
    # 2024年
    (2024, 1, 1): "元日",
    (2024, 1, 8): "成人の日",
    (2024, 2, 11): "建国記念の日",
    (2024, 2, 12): "振替休日",
    (2024, 2, 23): "天皇誕生日",
    (2024, 3, 20): "春分の日",
    (2024, 4, 29): "昭和の日",
    (2024, 5, 3): "憲法記念日",
    (2024, 5, 4): "みどりの日",
    (2024, 5, 5): "こどもの日",
    (2024, 5, 6): "振替休日",
    (2024, 7, 15): "海の日",
    (2024, 8, 11): "山の日",
    (2024, 8, 12): "振替休日",
    (2024, 9, 16): "敬老の日",
    (2024, 9, 22): "秋分の日",
    (2024, 9, 23): "振替休日",
    (2024, 10, 14): "スポーツの日",
    (2024, 11, 3): "文化の日",
    (2024, 11, 4): "振替休日",
    (2024, 11, 23): "勤労感謝の日",
    # 2025年
    (2025, 1, 1): "元日",
    (2025, 1, 13): "成人の日",
    (2025, 2, 11): "建国記念の日",
    (2025, 2, 23): "天皇誕生日",
    (2025, 2, 24): "振替休日",
    (2025, 3, 20): "春分の日",
    (2025, 4, 29): "昭和の日",
    (2025, 5, 3): "憲法記念日",
    (2025, 5, 4): "みどりの日",
    (2025, 5, 5): "こどもの日",
    (2025, 5, 6): "振替休日",
    (2025, 7, 21): "海の日",
    (2025, 8, 11): "山の日",
    (2025, 9, 15): "敬老の日",
    (2025, 9, 23): "秋分の日",
    (2025, 10, 13): "スポーツの日",
    (2025, 11, 3): "文化の日",
    (2025, 11, 23): "勤労感謝の日",
    (2025, 11, 24): "振替休日",
    # 2026年
    (2026, 1, 1): "元日",
    (2026, 1, 12): "成人の日",
    (2026, 2, 11): "建国記念の日",
    (2026, 2, 23): "天皇誕生日",
    (2026, 3, 20): "春分の日",
    (2026, 4, 29): "昭和の日",
    (2026, 5, 3): "憲法記念日",
    (2026, 5, 4): "みどりの日",
    (2026, 5, 5): "こどもの日",
    (2026, 5, 6): "振替休日",
    (2026, 7, 20): "海の日",
    (2026, 8, 11): "山の日",
    (2026, 9, 21): "敬老の日",
    (2026, 9, 22): "国民の休日",
    (2026, 9, 23): "秋分の日",
    (2026, 10, 12): "スポーツの日",
    (2026, 11, 3): "文化の日",
    (2026, 11, 23): "勤労感謝の日",
}


@router.get("/project/{project_id}", response_model=List[HolidayResponse])
def get_holidays_by_project(
    project_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    holiday_type: Optional[HolidayType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトの休日一覧を取得"""
    query = db.query(Holiday).filter(Holiday.project_id == project_id)

    if start_date:
        query = query.filter(Holiday.date >= start_date)
    if end_date:
        query = query.filter(Holiday.date <= end_date)
    if holiday_type:
        query = query.filter(Holiday.holiday_type == holiday_type)

    holidays = query.order_by(Holiday.date).all()
    return holidays


@router.get("/{holiday_id}", response_model=HolidayResponse)
def get_holiday(
    holiday_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日詳細を取得"""
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="休日が見つかりません")
    return holiday


@router.post("/", response_model=HolidayResponse)
def create_holiday(
    holiday: HolidayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日を作成"""
    # プロジェクトの存在確認
    project = db.query(Project).filter(Project.id == holiday.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    try:
        db_holiday = Holiday(**holiday.model_dump())
        db.add(db_holiday)
        db.commit()
        db.refresh(db_holiday)
        return db_holiday
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="この日付の休日は既に登録されています")


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(
    holiday_id: int,
    holiday: HolidayUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日を更新"""
    db_holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="休日が見つかりません")

    update_data = holiday.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holiday, key, value)

    db.commit()
    db.refresh(db_holiday)
    return db_holiday


@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日を削除"""
    db_holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="休日が見つかりません")

    db.delete(db_holiday)
    db.commit()
    return {"message": "休日を削除しました"}


@router.delete("/project/{project_id}/all")
def delete_all_holidays(
    project_id: int,
    holiday_type: Optional[HolidayType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトの休日を一括削除"""
    query = db.query(Holiday).filter(Holiday.project_id == project_id)
    if holiday_type:
        query = query.filter(Holiday.holiday_type == holiday_type)

    count = query.count()
    query.delete()
    db.commit()
    return {"message": f"{count}件の休日を削除しました", "deleted_count": count}


@router.post("/project/{project_id}/import", response_model=List[HolidayResponse])
def import_holidays(
    project_id: int,
    request: HolidayImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日を一括インポート"""
    # プロジェクトの存在確認
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    created = []
    skipped = 0

    for item in request.holidays:
        # 既存チェック
        existing = db.query(Holiday).filter(
            Holiday.project_id == project_id,
            Holiday.date == item.date
        ).first()

        if existing:
            if request.overwrite:
                existing.name = item.name
                existing.holiday_type = item.holiday_type
                created.append(existing)
            else:
                skipped += 1
        else:
            db_holiday = Holiday(
                project_id=project_id,
                date=item.date,
                name=item.name,
                holiday_type=item.holiday_type
            )
            db.add(db_holiday)
            created.append(db_holiday)

    db.commit()
    for h in created:
        db.refresh(h)

    return created


@router.post("/project/{project_id}/import-csv")
async def import_holidays_csv(
    project_id: int,
    file: UploadFile = File(...),
    overwrite: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CSVファイルから休日をインポート

    CSVフォーマット:
    date,name,type
    2024-01-01,元日,national
    2024-01-08,成人の日,national

    typeは省略可能（デフォルト: custom）
    """
    # プロジェクトの存在確認
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('shift_jis')

    reader = csv.DictReader(io.StringIO(text))

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            holiday_date = date.fromisoformat(row['date'].strip())
            name = row['name'].strip()
            holiday_type_str = row.get('type', 'custom').strip().lower()

            # type変換
            type_map = {
                'weekend': HolidayType.WEEKEND,
                'national': HolidayType.NATIONAL,
                'company': HolidayType.COMPANY,
                'custom': HolidayType.CUSTOM,
            }
            holiday_type = type_map.get(holiday_type_str, HolidayType.CUSTOM)

            # 既存チェック
            existing = db.query(Holiday).filter(
                Holiday.project_id == project_id,
                Holiday.date == holiday_date
            ).first()

            if existing:
                if overwrite:
                    existing.name = name
                    existing.holiday_type = holiday_type
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                db_holiday = Holiday(
                    project_id=project_id,
                    date=holiday_date,
                    name=name,
                    holiday_type=holiday_type
                )
                db.add(db_holiday)
                created_count += 1

        except Exception as e:
            errors.append(f"行{row_num}: {str(e)}")

    db.commit()

    return {
        "message": "インポートが完了しました",
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "errors": errors
    }


@router.post("/project/{project_id}/generate", response_model=List[HolidayResponse])
def generate_holidays(
    project_id: int,
    request: HolidayGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """期間内の週末・祝日を自動生成"""
    # プロジェクトの存在確認
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    created = []
    current = request.start_date

    while current <= request.end_date:
        # 週末チェック
        if request.include_weekends and current.weekday() >= 5:
            name = "土曜日" if current.weekday() == 5 else "日曜日"
            existing = db.query(Holiday).filter(
                Holiday.project_id == project_id,
                Holiday.date == current
            ).first()

            if not existing:
                db_holiday = Holiday(
                    project_id=project_id,
                    date=current,
                    name=name,
                    holiday_type=HolidayType.WEEKEND
                )
                db.add(db_holiday)
                created.append(db_holiday)

        # 祝日チェック
        if request.include_national_holidays:
            holiday_key = (current.year, current.month, current.day)
            if holiday_key in JAPANESE_NATIONAL_HOLIDAYS:
                existing = db.query(Holiday).filter(
                    Holiday.project_id == project_id,
                    Holiday.date == current
                ).first()

                if not existing:
                    db_holiday = Holiday(
                        project_id=project_id,
                        date=current,
                        name=JAPANESE_NATIONAL_HOLIDAYS[holiday_key],
                        holiday_type=HolidayType.NATIONAL
                    )
                    db.add(db_holiday)
                    created.append(db_holiday)

        current += timedelta(days=1)

    db.commit()
    for h in created:
        db.refresh(h)

    return created


@router.get("/project/{project_id}/working-days")
def get_working_days_count(
    project_id: int,
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """期間内の稼働日数を計算"""
    # 全日数
    total_days = (end_date - start_date).days + 1

    # 休日数
    holiday_count = db.query(Holiday).filter(
        Holiday.project_id == project_id,
        Holiday.date >= start_date,
        Holiday.date <= end_date
    ).count()

    working_days = total_days - holiday_count

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_days": total_days,
        "holiday_count": holiday_count,
        "working_days": working_days
    }


@router.get("/project/{project_id}/dates")
def get_holiday_dates(
    project_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """休日の日付リストを取得（EVM計算用）"""
    query = db.query(Holiday.date).filter(Holiday.project_id == project_id)

    if start_date:
        query = query.filter(Holiday.date >= start_date)
    if end_date:
        query = query.filter(Holiday.date <= end_date)

    holidays = query.all()
    return {"dates": [h[0].isoformat() for h in holidays]}
