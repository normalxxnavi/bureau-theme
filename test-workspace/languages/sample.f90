! Archivo de prueba del tema: Fortran.
module bureau_registry
  implicit none
  private
  public :: object_of_power, contain

  real(8), parameter :: MAX_RESONANCE = 1.0d3

  type :: object_of_power
    character(len=8) :: code
    integer :: threat = 1
    real(8) :: resonance = 0.0d0
  end type object_of_power

contains

  !> Contiene el objeto si su resonancia lo permite.
  logical function contain(item) result(ok)
    type(object_of_power), intent(inout) :: item
    if (item%resonance > MAX_RESONANCE) then
      ok = .false.
    else
      item%resonance = 0.0d0
      ok = .true.
    end if
  end function contain

end module bureau_registry

program main
  use bureau_registry
  implicit none
  type(object_of_power) :: items(3)
  integer :: i
  do i = 1, size(items)
    write(items(i)%code, '(A,I4.4)') 'OOP-', i
    print *, trim(items(i)%code), contain(items(i))
  end do
end program main
